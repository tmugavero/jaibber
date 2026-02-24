import { useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { initAbly, getAbly } from "@/lib/ably";
import { useContactStore } from "@/stores/contactStore";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { useProjectStore } from "@/stores/projectStore";
import { runClaudeStream, listenEvent, isTauri } from "@/lib/platform";
import { parseMentions } from "@/lib/mentions";
import type { AblyMessage } from "@/types/message";
import type { Contact } from "@/types/contact";
import type * as Ably from "ably";

/**
 * Subscribe to one project channel: presence tracking + message handling.
 * Returns a cleanup function.
 */
function subscribeToProjectChannel(
  ably: Ably.Realtime,
  contact: Contact,
  userId: string,
  username: string
): () => void {
  const channel = ably.channels.get(contact.ablyChannelName);

  // Include whether this connection is an agent (has this project registered locally).
  // Only agent connections count as "online" — web/viewer connections don't.
  const localProject = useProjectStore.getState().projects.find(
    (p) => p.projectId === contact.id
  );
  channel.presence.enter({
    userId,
    username,
    isAgent: !!localProject,
    agentName: localProject?.agentName || undefined,
  });

  // Use connectionId (unique per connection) instead of clientId so that the
  // same Jaibber account on two machines counts as two distinct presence members.
  const isOwnConnection = (member: { connectionId?: string }) =>
    member.connectionId != null && member.connectionId === ably.connection.id;

  const isAgentMember = (member: { data?: { isAgent?: boolean } }) =>
    member.data?.isAgent === true;

  channel.presence.subscribe("enter", (member) => {
    if (isOwnConnection(member)) return;
    if (!isAgentMember(member)) return;
    useContactStore.getState().setOnline(contact.id, true);
  });

  // "update" fires when the same clientId re-enters from another connection (same
  // user, different machine). Treat it the same as "enter".
  channel.presence.subscribe("update", (member) => {
    if (isOwnConnection(member)) return;
    if (!isAgentMember(member)) return;
    useContactStore.getState().setOnline(contact.id, true);
  });

  channel.presence.subscribe("leave", () => {
    channel.presence.get().then((members) => {
      const agents = members.filter((m) => !isOwnConnection(m) && isAgentMember(m));
      if (agents.length === 0) {
        useContactStore.getState().setOnline(contact.id, false);
      }
    }).catch(() => {});
  });

  // Hydrate initial online state
  channel.presence.get().then((members) => {
    const agents = members.filter((m) => !isOwnConnection(m) && isAgentMember(m));
    if (agents.length > 0) {
      useContactStore.getState().setOnline(contact.id, true);
    }
  }).catch(() => {});

  // Subscribe to messages on this project channel
  channel.subscribe(async (msg) => {
    const payload = msg.data as AblyMessage;
    if (!payload || payload.projectId !== contact.id) return;

    const convId = contact.id;
    const isMine = payload.from === userId;
    // Use connectionId to detect messages from THIS specific connection.
    // isMine checks userId (same user on any device), but for agent responses
    // we need to know if THIS connection published it — otherwise the web client
    // (same user, different connection) would skip the agent's responses.
    const isFromThisConnection = msg.connectionId === ably.connection.id;

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
      // Only Tauri desktop instances can run Claude — web clients are chat-only.
      if (isTauri) {
        const localProject = useProjectStore.getState().projects.find(
          (p) => p.projectId === contact.id
        );
        if (localProject) {
          const agentName = localProject.agentName || "Agent";

          // @mention routing: if mentions exist and none match this agent → skip
          const mentions = parseMentions(payload.text);
          if (mentions.length > 0 && !mentions.includes(agentName.toLowerCase())) {
            return; // another agent is targeted
          }

          const responseId = uuidv4();

          useChatStore.getState().addMessage({
            id: responseId,
            conversationId: convId,
            sender: "them",
            senderName: agentName,
            text: "",
            timestamp: new Date().toISOString(),
            status: "streaming",
          });

          channel.publish("message", {
            from: userId,
            fromUsername: agentName,
            projectId: contact.id,
            text: "",
            messageId: uuidv4(),
            responseId,
            type: "typing",
            agentName,
          } satisfies AblyMessage);

          // Build conversation context from recent chat history
          const recentMessages = (useChatStore.getState().messages[convId] ?? [])
            .filter((m) => m.status === "done" && m.id !== responseId)
            .slice(-20)
            .map((m) => `[${m.senderName || m.sender}]: ${m.text}`)
            .join("\n");

          // Ably chunk batching: accumulate chunks, flush every 200ms
          let chunkBuffer = "";
          let flushTimer: ReturnType<typeof setTimeout> | null = null;
          const flushChunks = () => {
            if (!chunkBuffer) return;
            const text = chunkBuffer;
            chunkBuffer = "";
            channel.publish("message", {
              from: userId,
              fromUsername: agentName,
              projectId: contact.id,
              text,
              messageId: responseId,
              type: "chunk",
              agentName,
            } satisfies AblyMessage);
          };

          // Listen for streaming events from Rust
          const unlisten = await listenEvent<{
            responseId: string;
            chunk: string;
            done: boolean;
            error: string | null;
          }>("claude-chunk", (event) => {
            if (event.responseId !== responseId) return;

            if (event.done) {
              // Flush remaining buffer
              if (flushTimer) clearTimeout(flushTimer);
              flushChunks();

              useChatStore.getState().markDone(convId, responseId);
              const fullText = (useChatStore.getState().messages[convId] ?? [])
                .find((m) => m.id === responseId)?.text ?? "";
              channel.publish("message", {
                from: userId,
                fromUsername: agentName,
                projectId: contact.id,
                text: fullText,
                messageId: responseId,
                type: "response",
                agentName,
              } satisfies AblyMessage);
              unlisten();
            } else if (event.error) {
              if (flushTimer) clearTimeout(flushTimer);
              const errText = `Agent error: ${event.error}`;
              useChatStore.getState().appendChunk(convId, responseId, errText);
              useChatStore.getState().updateStatus(convId, responseId, "error");
              channel.publish("message", {
                from: userId,
                fromUsername: agentName,
                projectId: contact.id,
                text: errText,
                messageId: responseId,
                type: "error",
                agentName,
              } satisfies AblyMessage);
              unlisten();
            } else {
              // Streaming chunk — update local store immediately, batch for Ably
              useChatStore.getState().appendChunk(convId, responseId, event.chunk);
              chunkBuffer += event.chunk;
              if (!flushTimer) {
                flushTimer = setTimeout(() => {
                  flushTimer = null;
                  flushChunks();
                }, 200);
              }
            }
          });

          // Kick off streaming Claude process
          try {
            await runClaudeStream({
              prompt: payload.text,
              projectDir: localProject.projectDir,
              responseId,
              systemPrompt: localProject.agentInstructions || "",
              conversationContext: recentMessages,
            });
          } catch (err) {
            // runClaudeStream rejects if spawn fails
            if (flushTimer) clearTimeout(flushTimer);
            const errText = `Agent error: ${err}`;
            useChatStore.getState().appendChunk(convId, responseId, errText);
            useChatStore.getState().updateStatus(convId, responseId, "error");
            channel.publish("message", {
              from: userId,
              fromUsername: agentName,
              projectId: contact.id,
              text: errText,
              messageId: responseId,
              type: "error",
              agentName,
            } satisfies AblyMessage);
            unlisten();
          }
        }
      } // end isTauri agent check
    } else if (payload.type === "typing") {
      if (isFromThisConnection) return;
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
    } else if (payload.type === "chunk") {
      if (isFromThisConnection) return;
      useChatStore.getState().appendChunk(convId, payload.messageId, payload.text);
    } else if (payload.type === "response" || payload.type === "done" || payload.type === "error") {
      if (isFromThisConnection) return;
      const isError = payload.type === "error";
      useChatStore.getState().replaceMessage(
        convId,
        payload.messageId,
        payload.text,
        isError ? "error" : "done"
      );
    }
  });

  return () => {
    channel.presence.leave();
    channel.unsubscribe();
  };
}

export function useAbly() {
  const initializedRef = useRef(false);
  const ablyRef = useRef<Ably.Realtime | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  // Track which channels we've already subscribed to (by channel name)
  const channelCleanupsRef = useRef(new Map<string, () => void>());

  useEffect(() => {
    const ensureChannelSubscribed = (contact: Contact) => {
      if (channelCleanupsRef.current.has(contact.ablyChannelName)) return;
      const ably = ablyRef.current;
      if (!ably) return;
      const { userId, username } = useAuthStore.getState();
      if (!userId || !username) return;
      const cleanup = subscribeToProjectChannel(ably, contact, userId, username);
      channelCleanupsRef.current.set(contact.ablyChannelName, cleanup);
    };

    const tryInit = () => {
      if (initializedRef.current) return;
      const { userId, username, token } = useAuthStore.getState();
      const { apiBaseUrl } = useSettingsStore.getState().settings;
      const contacts = useContactStore.getState().contacts;

      if (!userId || !username || !token || !apiBaseUrl) return;
      if (Object.keys(contacts).length === 0) return;

      const ably = initAbly(apiBaseUrl, userId, () => useAuthStore.getState().token);
      ablyRef.current = ably;
      initializedRef.current = true;

      // Enter global presence channel
      const localProjects = useProjectStore.getState().projects;
      const presenceChannel = ably.channels.get("jaibber:presence");
      presenceChannel.presence.enter({
        userId,
        username,
        projectIds: localProjects.map((p) => p.projectId),
      });

      // Subscribe to all current project channels
      for (const contact of Object.values(contacts)) {
        ensureChannelSubscribed(contact);
      }

      cleanupRef.current = () => {
        presenceChannel.presence.leave();
        presenceChannel.unsubscribe();
        channelCleanupsRef.current.forEach((cleanup) => cleanup());
        channelCleanupsRef.current.clear();
      };
    };

    // When contacts change after init, subscribe to any new project channels
    const handleContactsChange = () => {
      if (!initializedRef.current) {
        tryInit();
        return;
      }
      const contacts = useContactStore.getState().contacts;
      for (const contact of Object.values(contacts)) {
        ensureChannelSubscribed(contact);
      }
    };

    tryInit();

    const unsubAuth = useAuthStore.subscribe(() => {
      if (!initializedRef.current) tryInit();
    });
    const unsubContacts = useContactStore.subscribe(handleContactsChange);

    return () => {
      unsubAuth();
      unsubContacts();
      cleanupRef.current?.();
      initializedRef.current = false;
      ablyRef.current = null;
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
