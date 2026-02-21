import { useEffect, useRef } from "react";
import Ably from "ably";
import { v4 as uuidv4 } from "uuid";
import { initAbly, getAbly } from "@/lib/ably";
import { useContactStore } from "@/stores/contactStore";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { runClaude } from "@/lib/tauri";
import type { AblyMessage } from "@/types/message";

export function useAbly() {
  const initializedRef = useRef(false);

  useEffect(() => {
    const settings = useSettingsStore.getState().settings;
    if (!settings.ablyApiKey || !settings.myHandle) return;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const ably = initAbly(settings.ablyApiKey, settings.myHandle);
    const myHandle = settings.myHandle;
    const myMode = settings.myMode;
    const projectDir = settings.projectDir;

    // ── Presence channel ─────────────────────────────────────────────────────
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

    // Hydrate from current presence members
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

    // ── DM channel ────────────────────────────────────────────────────────────
    const dmChannel = ably.channels.get(`jaibber:dm:${myHandle}`);

    dmChannel.subscribe(async (msg) => {
      const payload = msg.data as AblyMessage;
      if (!payload || payload.to !== myHandle) return;

      const convId = payload.from;

      // Make sure contact exists
      useContactStore.getState().upsertContact({
        id: payload.from,
        name: payload.from,
        mode: "hub",
        isOnline: true,
        lastSeen: null,
      });

      if (payload.type === "message") {
        // Show incoming message bubble
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
          const responseId = uuidv4();

          // Show typing indicator placeholder
          useChatStore.getState().addMessage({
            id: responseId,
            conversationId: convId,
            sender: "me",
            text: "",
            timestamp: new Date().toISOString(),
            status: "streaming",
          });

          // Send typing signal
          const senderDmChannel = getAbly()?.channels.get(`jaibber:dm:${payload.from}`);
          senderDmChannel?.publish("message", {
            from: myHandle,
            to: payload.from,
            text: "",
            messageId: uuidv4(),
            type: "typing",
          } satisfies AblyMessage);

          try {
            const result = await runClaude(payload.text);
            useChatStore.getState().appendChunk(convId, responseId, result);
            useChatStore.getState().markDone(convId, responseId);

            // Send response back to sender
            senderDmChannel?.publish("message", {
              from: myHandle,
              to: payload.from,
              text: result,
              messageId: responseId,
              type: "response",
            } satisfies AblyMessage);
          } catch (err) {
            const errText = `⚠️ Agent error: ${err}`;
            // Show error locally on agent side
            useChatStore.getState().appendChunk(convId, responseId, errText);
            useChatStore.getState().updateStatus(convId, responseId, "error");
            // Send error back to hub so it stops hanging
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
        // Show typing indicator for incoming typing signals
        const convMessages = useChatStore.getState().messages[convId] ?? [];
        const hasTyping = convMessages.some(
          (m) => m.sender === "them" && m.status === "streaming"
        );
        if (!hasTyping) {
          useChatStore.getState().addMessage({
            id: `typing-${payload.from}`,
            conversationId: convId,
            sender: "them",
            text: "",
            timestamp: new Date().toISOString(),
            status: "streaming",
          });
        }
      } else if (payload.type === "response" || payload.type === "done" || payload.type === "error") {
        const isError = payload.type === "error";
        // Replace typing indicator with real message (or error)
        const convMessages = useChatStore.getState().messages[convId] ?? [];
        const typingMsg = convMessages.find(
          (m) => m.id === `typing-${payload.from}`
        );
        if (typingMsg) {
          useChatStore.getState().appendChunk(convId, typingMsg.id, payload.text);
          useChatStore.getState().updateStatus(convId, typingMsg.id, isError ? "error" : "done");
        } else {
          useChatStore.getState().addMessage({
            id: payload.messageId,
            conversationId: convId,
            sender: "them",
            text: payload.text,
            timestamp: new Date().toISOString(),
            status: isError ? "error" : "done",
          });
        }
      }
    });

    return () => {
      presenceChannel.presence.leave();
      presenceChannel.unsubscribe();
      dmChannel.unsubscribe();
      initializedRef.current = false;
    };
  }, []);
}

/** Send a chat message to a contact. Returns the local message id. */
export function sendMessage(toHandle: string, text: string): string {
  const ably = getAbly();
  const myHandle = useSettingsStore.getState().settings.myHandle;
  const messageId = uuidv4();

  // Add locally as "sending"
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
