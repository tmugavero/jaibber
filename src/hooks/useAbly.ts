import { useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { initAbly, getAbly } from "@/lib/ably";
import { useContactStore } from "@/stores/contactStore";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { runClaude } from "@/lib/tauri";
import type { AblyMessage } from "@/types/message";

function connectAbly(ablyApiKey: string, myHandle: string, myMode: string, projectDir: string | null) {
  const ably = initAbly(ablyApiKey, myHandle);

  // ── Presence channel ───────────────────────────────────────────────────────
  const presenceChannel = ably.channels.get("jaibber:presence");

  presenceChannel.presence.enter({ mode: myMode });

  presenceChannel.presence.subscribe("enter", (member) => {
    if (member.clientId === myHandle) return;
    useContactStore.getState().upsertContact({
      id: member.clientId,
      name: member.clientId,
      mode: (member.data as any)?.mode ?? "hub",
      isOnline: true,
      lastSeen: null,
    });
  });

  presenceChannel.presence.subscribe("leave", (member) => {
    if (member.clientId === myHandle) return;
    useContactStore.getState().setOnline(member.clientId, false);
  });

  // Hydrate existing presence members
  presenceChannel.presence.get().then((members) => {
    members.forEach((member) => {
      if (member.clientId === myHandle) return;
      useContactStore.getState().upsertContact({
        id: member.clientId,
        name: member.clientId,
        mode: (member.data as any)?.mode ?? "hub",
        isOnline: true,
        lastSeen: null,
      });
    });
  }).catch(() => {});

  // ── DM channel ─────────────────────────────────────────────────────────────
  const dmChannel = ably.channels.get(`jaibber:dm:${myHandle}`);

  dmChannel.subscribe(async (msg) => {
    const payload = msg.data as AblyMessage;
    if (!payload || payload.to !== myHandle) return;

    const convId = payload.from;

    useContactStore.getState().upsertContact({
      id: payload.from,
      name: payload.from,
      mode: "hub",
      isOnline: true,
      lastSeen: null,
    });

    if (payload.type === "message") {
      useChatStore.getState().addMessage({
        id: payload.messageId,
        conversationId: convId,
        sender: "them",
        text: payload.text,
        timestamp: new Date().toISOString(),
        status: "done",
      });

      // Agent mode: forward to claude --print, then reply
      if (myMode === "agent" && projectDir) {
        // Generate the responseId now — we'll send it in the typing notification
        // so the hub can pre-create a bubble with the correct ID
        const responseId = uuidv4();

        // Add local streaming bubble on the agent side
        useChatStore.getState().addMessage({
          id: responseId,
          conversationId: convId,
          sender: "me",
          text: "",
          timestamp: new Date().toISOString(),
          status: "streaming",
        });

        const senderDmChannel = getAbly()?.channels.get(`jaibber:dm:${payload.from}`);

        // Tell the hub we're typing — include responseId so it can create
        // a bubble with the right ID immediately
        senderDmChannel?.publish("message", {
          from: myHandle,
          to: payload.from,
          text: "",
          messageId: uuidv4(),
          responseId,
          type: "typing",
        } satisfies AblyMessage);

        try {
          const result = await runClaude(payload.text);
          useChatStore.getState().appendChunk(convId, responseId, result);
          useChatStore.getState().markDone(convId, responseId);

          senderDmChannel?.publish("message", {
            from: myHandle,
            to: payload.from,
            text: result,
            messageId: responseId,
            type: "response",
          } satisfies AblyMessage);
        } catch (err) {
          const errText = `⚠️ Agent error: ${err}`;
          useChatStore.getState().appendChunk(convId, responseId, errText);
          useChatStore.getState().updateStatus(convId, responseId, "error");
          senderDmChannel?.publish("message", {
            from: myHandle,
            to: payload.from,
            text: errText,
            messageId: responseId,
            type: "error",
          } satisfies AblyMessage);
        }
      }
    } else if (payload.type === "typing") {
      // Create a streaming bubble using the responseId the agent sent,
      // so we know exactly which bubble to update when the response arrives.
      // Fall back to a timestamp-based ID if responseId is missing (old agents).
      const bubbleId = payload.responseId ?? `typing-${payload.from}-${Date.now()}`;
      useChatStore.getState().addMessage({
        id: bubbleId,
        conversationId: convId,
        sender: "them",
        text: "",
        timestamp: new Date().toISOString(),
        status: "streaming",
      });
    } else if (payload.type === "response" || payload.type === "done" || payload.type === "error") {
      const isError = payload.type === "error";
      // The agent sends responseId as the messageId in response/error payloads.
      // replaceMessage updates that bubble directly — no static typing-{from} ID needed.
      useChatStore.getState().replaceMessage(
        convId,
        payload.messageId,
        payload.text,
        isError ? "error" : "done"
      );
    }
  });

  return () => {
    presenceChannel.presence.leave();
    presenceChannel.unsubscribe();
    dmChannel.unsubscribe();
  };
}

export function useAbly() {
  const initializedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Try immediately in case settings are already loaded
    const tryInit = () => {
      if (initializedRef.current) return;
      const { ablyApiKey, myHandle, myMode, projectDir } = useSettingsStore.getState().settings;
      if (!ablyApiKey || !myHandle) return;
      initializedRef.current = true;
      cleanupRef.current = connectAbly(ablyApiKey, myHandle, myMode, projectDir);
    };

    tryInit();

    // Also subscribe to store changes — handles the race where AppShell mounts
    // before the async Tauri settings load completes
    const unsub = useSettingsStore.subscribe((state) => {
      if (!initializedRef.current && state.settings.ablyApiKey && state.settings.myHandle) {
        tryInit();
      }
    });

    return () => {
      unsub();
      cleanupRef.current?.();
      initializedRef.current = false;
      cleanupRef.current = null;
    };
  }, []);
}

/** Send a chat message to a contact. Returns the local message id. */
export function sendMessage(toHandle: string, text: string): string {
  const ably = getAbly();
  const myHandle = useSettingsStore.getState().settings.myHandle;
  const messageId = uuidv4();

  useChatStore.getState().addMessage({
    id: messageId,
    conversationId: toHandle,
    sender: "me",
    text,
    timestamp: new Date().toISOString(),
    status: "sending",
  });

  if (ably) {
    const channel = ably.channels.get(`jaibber:dm:${toHandle}`);
    channel.publish("message", {
      from: myHandle,
      to: toHandle,
      text,
      messageId,
      type: "message",
    } satisfies AblyMessage).then(() => {
      useChatStore.getState().updateStatus(toHandle, messageId, "sent");
    }).catch(() => {
      useChatStore.getState().updateStatus(toHandle, messageId, "error");
    });
  } else {
    useChatStore.getState().updateStatus(toHandle, messageId, "error");
  }

  return messageId;
}
