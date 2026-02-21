import { useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { initAbly, getAbly } from "@/lib/ably";
import { useContactStore } from "@/stores/contactStore";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { useProjectStore } from "@/stores/projectStore";
import { runClaude } from "@/lib/tauri";
import type { AblyMessage } from "@/types/message";
import type { Contact } from "@/types/contact";

function connectAbly(
  apiBaseUrl: string,
  userId: string,
  username: string,
  contacts: Record<string, Contact>,
  getToken: () => string | null
) {
  const ably = initAbly(apiBaseUrl, userId, getToken);

  // ── Global presence channel ───────────────────────────────────────────────
  const presenceChannel = ably.channels.get("jaibber:presence");
  const localProjects = useProjectStore.getState().projects;
  presenceChannel.presence.enter({
    userId,
    username,
    projectIds: localProjects.map((p) => p.projectId),
  });

  // ── Per-project channels ──────────────────────────────────────────────────
  const projectChannels = Object.values(contacts).map((contact) => {
    const channel = ably.channels.get(contact.ablyChannelName);

    // Enter presence on this project channel
    channel.presence.enter({ userId, username });

    // Track per-project online status via presence
    channel.presence.subscribe("enter", (member) => {
      if (member.clientId === userId) return;
      useContactStore.getState().setOnline(contact.id, true);
    });
    channel.presence.subscribe("leave", () => {
      channel.presence.get().then((members) => {
        const others = members.filter((m) => m.clientId !== userId);
        if (others.length === 0) {
          useContactStore.getState().setOnline(contact.id, false);
        }
      }).catch(() => {});
    });

    // Hydrate initial presence state
    channel.presence.get().then((members) => {
      const others = members.filter((m) => m.clientId !== userId);
      if (others.length > 0) {
        useContactStore.getState().setOnline(contact.id, true);
      }
    }).catch(() => {});

    // Subscribe to messages on this project channel
    channel.subscribe(async (msg) => {
      const payload = msg.data as AblyMessage;
      if (!payload || payload.projectId !== contact.id) return;

      const convId = contact.id;
      const isMine = payload.from === userId;

      if (payload.type === "message") {
        // All members see all messages (group chat)
        useChatStore.getState().addMessage({
          id: payload.messageId,
          conversationId: convId,
          sender: isMine ? "me" : "them",
          senderName: payload.fromUsername,
          text: payload.text,
          timestamp: new Date().toISOString(),
          status: "done",
        });

        // If this machine has the project registered locally → act as responder.
        // No isMine check: on a single-machine setup the user and agent share the same account.
        // chatStore already deduplicates sent messages by id so no doubles occur.
        {
          const localProject = useProjectStore.getState().projects.find(
            (p) => p.projectId === contact.id
          );
          if (localProject) {
            const responseId = uuidv4();

            // Add local streaming bubble
            useChatStore.getState().addMessage({
              id: responseId,
              conversationId: convId,
              sender: "me",
              senderName: "Claude",
              text: "",
              timestamp: new Date().toISOString(),
              status: "streaming",
            });

            // Notify all members we're processing
            channel.publish("message", {
              from: userId,
              fromUsername: "Claude",
              projectId: contact.id,
              text: "",
              messageId: uuidv4(),
              responseId,
              type: "typing",
            } satisfies AblyMessage);

            try {
              const result = await runClaude(payload.text, localProject.projectDir);
              useChatStore.getState().appendChunk(convId, responseId, result);
              useChatStore.getState().markDone(convId, responseId);

              channel.publish("message", {
                from: userId,
                fromUsername: "Claude",
                projectId: contact.id,
                text: result,
                messageId: responseId,
                type: "response",
              } satisfies AblyMessage);
            } catch (err) {
              const errText = `⚠️ Agent error: ${err}`;
              useChatStore.getState().appendChunk(convId, responseId, errText);
              useChatStore.getState().updateStatus(convId, responseId, "error");
              channel.publish("message", {
                from: userId,
                fromUsername: "Claude",
                projectId: contact.id,
                text: errText,
                messageId: responseId,
                type: "error",
              } satisfies AblyMessage);
            }
          }
        }
      } else if (payload.type === "typing") {
        if (isMine) return;
        const bubbleId = payload.responseId ?? `typing-${payload.from}-${Date.now()}`;
        useChatStore.getState().addMessage({
          id: bubbleId,
          conversationId: convId,
          sender: "them",
          senderName: payload.fromUsername,
          text: "",
          timestamp: new Date().toISOString(),
          status: "streaming",
        });
      } else if (payload.type === "response" || payload.type === "done" || payload.type === "error") {
        if (isMine) return;
        const isError = payload.type === "error";
        useChatStore.getState().replaceMessage(
          convId,
          payload.messageId,
          payload.text,
          isError ? "error" : "done"
        );
      }
    });

    return channel;
  });

  return () => {
    presenceChannel.presence.leave();
    presenceChannel.unsubscribe();
    projectChannels.forEach((ch) => {
      ch.presence.leave();
      ch.unsubscribe();
    });
  };
}

export function useAbly() {
  const initializedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const tryInit = () => {
      if (initializedRef.current) return;
      const { userId, username, token } = useAuthStore.getState();
      const { apiBaseUrl } = useSettingsStore.getState().settings;
      const contacts = useContactStore.getState().contacts;

      if (!userId || !username || !token || !apiBaseUrl) return;
      if (Object.keys(contacts).length === 0) return;

      initializedRef.current = true;
      cleanupRef.current = connectAbly(
        apiBaseUrl,
        userId,
        username,
        contacts,
        () => useAuthStore.getState().token
      );
    };

    tryInit();

    const unsubAuth = useAuthStore.subscribe(() => {
      if (!initializedRef.current) tryInit();
    });
    const unsubContacts = useContactStore.subscribe(() => {
      if (!initializedRef.current) tryInit();
    });

    return () => {
      unsubAuth();
      unsubContacts();
      cleanupRef.current?.();
      initializedRef.current = false;
      cleanupRef.current = null;
    };
  }, []);
}

/** Send a chat message to a project channel. Returns the local message id. */
export function sendMessage(projectId: string, text: string): string {
  const ably = getAbly();
  const { userId, username } = useAuthStore.getState();
  const contact = useContactStore.getState().contacts[projectId];
  const messageId = uuidv4();

  useChatStore.getState().addMessage({
    id: messageId,
    conversationId: projectId,
    sender: "me",
    senderName: username ?? "me",
    text,
    timestamp: new Date().toISOString(),
    status: "sending",
  });

  if (ably && contact && userId && username) {
    const channel = ably.channels.get(contact.ablyChannelName);
    channel.publish("message", {
      from: userId,
      fromUsername: username,
      projectId,
      text,
      messageId,
      type: "message",
    } satisfies AblyMessage).then(() => {
      useChatStore.getState().updateStatus(projectId, messageId, "sent");
    }).catch(() => {
      useChatStore.getState().updateStatus(projectId, messageId, "error");
    });
  } else {
    useChatStore.getState().updateStatus(projectId, messageId, "error");
  }

  return messageId;
}
