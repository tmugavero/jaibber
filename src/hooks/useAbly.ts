import { useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { initAbly, getAbly } from "@/lib/ably";
import { useContactStore } from "@/stores/contactStore";
import { useChatStore } from "@/stores/chatStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { useProjectStore, type LocalProject } from "@/stores/projectStore";
import { runAgentStream, listenEvent, isTauri } from "@/lib/platform";
import { parseMentions } from "@/lib/mentions";
import { persistMessage } from "@/lib/messageApi";
import { updateTask } from "@/lib/taskApi";
import { useTaskStore } from "@/stores/taskStore";
import type { AblyMessage, ExecutionMode } from "@/types/message";
import type { Task } from "@/types/task";
import type { Contact, AgentInfo } from "@/types/contact";
import type * as Ably from "ably";

/** Max depth for agent-to-agent response chains. Prevents infinite loops. */
const MAX_RESPONSE_DEPTH = 3;

/** Plan-mode system prompt prefix — instructs agent to analyze only, not execute. */
const PLAN_MODE_PREFIX =
  "You are in PLAN MODE. Analyze the request and provide a detailed plan of what changes " +
  "you would make, including specific files and code snippets. Do NOT execute any file " +
  "modifications, write any files, or run any commands that change state. You may read " +
  "files for context. Format your plan clearly with numbered steps.";

/**
 * Shared agent response logic: creates a streaming bubble, runs the agent,
 * publishes chunks/response to the channel. Used for both human→agent and
 * agent→agent message handling.
 */
async function respondToMessage(
  channel: Ably.RealtimeChannel,
  contact: Contact,
  localProject: LocalProject,
  agentName: string,
  userId: string,
  promptText: string,
  incomingDepth: number,
  incomingChain: string[],
  executionMode: ExecutionMode = "auto",
  onComplete?: (success: boolean) => void
) {
  const convId = contact.id;
  const nextDepth = incomingDepth + 1;
  const nextChain = [...incomingChain, agentName.toLowerCase()];
  const responseId = uuidv4();

  useChatStore.getState().addMessage({
    id: responseId,
    conversationId: convId,
    sender: "them",
    senderName: agentName,
    text: "",
    timestamp: new Date().toISOString(),
    status: "streaming",
    executionMode,
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

  // Build conversation context from recent chat history.
  const recentMessages = (useChatStore.getState().messages[convId] ?? [])
    .filter((m) => m.status === "done" && m.id !== responseId)
    .slice(-20)
    .map((m) => {
      const role = m.sender === "me" ? "User" : `Assistant (${m.senderName || "Agent"})`;
      return `${role}: ${m.text}`;
    })
    .join("\n\n");

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
  }>("agent-chunk", (event) => {
    if (event.responseId !== responseId) return;

    if (event.done) {
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
        isAgentMessage: true,
        responseDepth: nextDepth,
        respondingChain: nextChain,
      } satisfies AblyMessage);

      // Dual-write: persist agent response to server
      const { token: t } = useAuthStore.getState();
      const { apiBaseUrl: url } = useSettingsStore.getState().settings;
      if (t && url && fullText) {
        persistMessage(url, t, convId, {
          id: responseId,
          senderType: "agent",
          senderName: agentName,
          type: "response",
          text: fullText,
        });
      }

      onComplete?.(true);
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

      // Dual-write: persist agent error to server
      const { token: t2 } = useAuthStore.getState();
      const { apiBaseUrl: url2 } = useSettingsStore.getState().settings;
      if (t2 && url2) {
        persistMessage(url2, t2, convId, {
          id: responseId,
          senderType: "agent",
          senderName: agentName,
          type: "error",
          text: errText,
        });
      }

      onComplete?.(false);
      unlisten();
    } else {
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

  // Build system prompt, prepending plan-mode instructions if needed
  let systemPrompt = localProject.agentInstructions || "";
  if (executionMode === "plan") {
    systemPrompt = PLAN_MODE_PREFIX + (systemPrompt ? "\n\n" + systemPrompt : "");
  }

  // Kick off streaming agent process
  try {
    await runAgentStream({
      prompt: promptText,
      projectDir: localProject.projectDir,
      responseId,
      systemPrompt,
      conversationContext: recentMessages,
    });
  } catch (err) {
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
    onComplete?.(false);
    unlisten();
  }
}

/**
 * Check if this agent should respond to an incoming message/response,
 * applying @mention routing and loop prevention.
 * Returns true if the agent should respond.
 */
function shouldAgentRespond(
  text: string,
  agentName: string,
  depth: number,
  chain: string[]
): boolean {
  // Loop prevention: max depth
  if (depth >= MAX_RESPONSE_DEPTH) return false;
  // Loop prevention: already responded in this chain
  if (chain.includes(agentName.toLowerCase())) return false;
  // @mention routing: if mentions exist and none match this agent → skip
  const mentions = parseMentions(text);
  if (mentions.length > 0 && !mentions.includes(agentName.toLowerCase())) return false;
  return true;
}

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
  const channel = ably.channels.get(contact.ablyChannelName, {
    params: { rewind: "2m" },
  });

  const localProject = useProjectStore.getState().projects.find(
    (p) => p.projectId === contact.id
  );
  const isOwnConnection = (member: { connectionId?: string }) =>
    member.connectionId != null && member.connectionId === ably.connection.id;

  const isAgentMember = (member: { data?: { isAgent?: boolean } }) =>
    member.data?.isAgent === true;

  const syncAgents = () => {
    channel.presence.get().then((members) => {
      const allAgents = members.filter((m) => isAgentMember(m));
      const remoteAgents = allAgents.filter((m) => !isOwnConnection(m));
      const agentInfos: AgentInfo[] = remoteAgents.map((m) => ({
        connectionId: m.connectionId ?? "",
        agentName: m.data?.agentName ?? "Agent",
        machineName: m.data?.machineName,
        agentInstructions: m.data?.agentInstructions,
      }));
      useContactStore.getState().setOnlineAgents(contact.id, agentInfos);
      useContactStore.getState().setOnline(contact.id, allAgents.length > 0);
    }).catch(() => {});
  };

  // Enter presence, then run initial sync once enter completes
  channel.presence.enter({
    userId,
    username,
    isAgent: !!localProject,
    agentName: localProject?.agentName || undefined,
    agentInstructions: localProject?.agentInstructions || undefined,
    machineName: localProject ? useSettingsStore.getState().settings.machineName : undefined,
  }).then(() => syncAgents()).catch(() => {});

  channel.presence.subscribe("enter", (member) => {
    if (!isAgentMember(member)) return;
    syncAgents();
  });

  channel.presence.subscribe("update", (member) => {
    if (!isAgentMember(member)) return;
    syncAgents();
  });

  channel.presence.subscribe("leave", () => {
    syncAgents();
  });

  // Subscribe to all events on this project channel (messages + tasks)
  channel.subscribe(async (msg) => {
    // Handle task events (published by server with event name "task")
    // Also detect task events by checking data.type for "task-*" patterns (fallback)
    const isTaskEvent = msg.name === "task" ||
      (msg.data && typeof msg.data === "object" && typeof msg.data.type === "string" && msg.data.type.startsWith("task-"));

    if (isTaskEvent) {
      const data = msg.data as { type: string; task: Task; projectId: string };
      if (!data?.task || data.projectId !== contact.id) return;

      if (data.type === "task-created") {
        useTaskStore.getState().addTask(data.task);
      } else if (data.type === "task-updated") {
        useTaskStore.getState().updateTask(data.task.id, data.task);
      } else if (data.type === "task-deleted") {
        useTaskStore.getState().removeTask(data.task.id);
      }

      // Auto-execute: if this task is assigned to a local agent and is "submitted", pick it up
      if (
        isTauri &&
        (data.type === "task-created" || data.type === "task-updated") &&
        data.task.status === "submitted" &&
        data.task.assignedAgentName
      ) {
        const lp = useProjectStore.getState().projects.find(
          (p) => p.projectId === contact.id
        );
        if (lp && lp.agentName.toLowerCase() === data.task.assignedAgentName.toLowerCase()) {
          const { token: tkn } = useAuthStore.getState();
          const { apiBaseUrl: base } = useSettingsStore.getState().settings;

          // Mark task as "working"
          if (tkn && base) {
            updateTask(base, tkn, data.task.id, { status: "working" }).catch(() => {});
          }

          // Announce task pickup in chat so all members see it
          const notifId = uuidv4();
          const priorityLabel = data.task.priority !== "medium" ? ` [${data.task.priority}]` : "";
          const notifText = `Picking up task${priorityLabel}: ${data.task.title}`;
          useChatStore.getState().addMessage({
            id: notifId,
            conversationId: contact.id,
            sender: "them",
            senderName: lp.agentName,
            text: notifText,
            timestamp: new Date().toISOString(),
            status: "done",
          });
          channel.publish("message", {
            from: userId,
            fromUsername: lp.agentName,
            projectId: contact.id,
            text: notifText,
            messageId: notifId,
            type: "message",
            agentName: lp.agentName,
            isTaskNotification: true,
          } satisfies AblyMessage);

          // Build prompt from task title + description
          const taskPrompt = data.task.description
            ? `Task: ${data.task.title}\n\n${data.task.description}`
            : `Task: ${data.task.title}`;

          respondToMessage(
            channel, contact, lp, lp.agentName, userId, taskPrompt, 0, [], "auto",
            (success) => {
              const { token: t3 } = useAuthStore.getState();
              const { apiBaseUrl: url3 } = useSettingsStore.getState().settings;
              if (t3 && url3) {
                updateTask(url3, t3, data.task.id, {
                  status: success ? "completed" : "failed",
                }).catch(() => {});
              }
            }
          );
        }
      }
      return; // Task events handled — don't fall through to message handling
    }

    const payload = msg.data as AblyMessage;
    if (!payload || payload.projectId !== contact.id) return;

    const convId = contact.id;
    const isMine = payload.from === userId;
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
        executionMode: payload.executionMode,
      });

      // Agent response: check if this machine should respond (skip task notifications)
      if (isTauri && !payload.isTaskNotification) {
        const lp = useProjectStore.getState().projects.find(
          (p) => p.projectId === contact.id
        );
        if (lp) {
          const name = lp.agentName || "Agent";
          const depth = payload.responseDepth ?? 0;
          const chain = payload.respondingChain ?? [];

          if (shouldAgentRespond(payload.text, name, depth, chain)) {
            respondToMessage(channel, contact, lp, name, userId, payload.text, depth, chain, payload.executionMode ?? "auto");
          }
        }
      }
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

      // Agent-to-agent: if a completed response @mentions this agent, respond.
      // The response is already displayed — just trigger a new agent response.
      if (!isError && payload.isAgentMessage && payload.text && isTauri) {
        const lp = useProjectStore.getState().projects.find(
          (p) => p.projectId === contact.id
        );
        if (lp) {
          const name = lp.agentName || "Agent";
          const depth = payload.responseDepth ?? 0;
          const chain = payload.respondingChain ?? [];
          const mentions = parseMentions(payload.text);

          // Only respond if explicitly @mentioned (agent-to-agent requires explicit mention)
          if (
            mentions.includes(name.toLowerCase()) &&
            shouldAgentRespond(payload.text, name, depth, chain)
          ) {
            respondToMessage(channel, contact, lp, name, userId, payload.text, depth, chain, "auto");
          }
        }
      }
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
  const channelCleanupsRef = useRef(new Map<string, () => void>());

  useEffect(() => {
    const ensureChannelSubscribed = (contact: Contact) => {
      // Skip org-admin view-only projects — user has no Ably capability for these channels
      if (contact.role === "org-admin") return;
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

      const localProjects = useProjectStore.getState().projects;
      const presenceChannel = ably.channels.get("jaibber:presence");
      presenceChannel.presence.enter({
        userId,
        username,
        projectIds: localProjects.map((p) => p.projectId),
      });

      // Listen for refresh-projects signals from other clients (e.g. when a new org project is created)
      presenceChannel.subscribe("refresh-projects", () => {
        const { token: t } = useAuthStore.getState();
        const { apiBaseUrl: url } = useSettingsStore.getState().settings;
        if (t && url) {
          useContactStore.getState().loadFromServer(url, t);
        }
      });

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

    const handleContactsChange = () => {
      if (!initializedRef.current) {
        tryInit();
        return;
      }
      const contacts = useContactStore.getState().contacts;
      const ably = ablyRef.current;

      // Check if any new channels need subscribing
      let hasNewChannels = false;
      for (const contact of Object.values(contacts)) {
        if (contact.role === "org-admin") continue;
        if (!channelCleanupsRef.current.has(contact.ablyChannelName)) {
          hasNewChannels = true;
          break;
        }
      }

      if (hasNewChannels && ably) {
        // Force token refresh to get capabilities for new channels
        ably.auth.authorize().then(() => {
          for (const contact of Object.values(contacts)) {
            ensureChannelSubscribed(contact);
          }
        }).catch(() => {
          // Still try subscribing — might work if token already covers channels
          for (const contact of Object.values(contacts)) {
            ensureChannelSubscribed(contact);
          }
        });
      } else {
        for (const contact of Object.values(contacts)) {
          ensureChannelSubscribed(contact);
        }
      }
    };

    tryInit();

    const unsubAuth = useAuthStore.subscribe(() => {
      if (!initializedRef.current) tryInit();
    });
    const unsubContacts = useContactStore.subscribe(handleContactsChange);
    const unsubProjects = useProjectStore.subscribe(() => {
      const ably = ablyRef.current;
      if (!ably) return;
      const { userId: uid, username: uname } = useAuthStore.getState();
      if (!uid || !uname) return;
      const lps = useProjectStore.getState().projects;
      const pc = ably.channels.get("jaibber:presence");
      pc.presence.update({
        userId: uid,
        username: uname,
        projectIds: lps.map((p) => p.projectId),
      });
    });

    return () => {
      unsubAuth();
      unsubContacts();
      unsubProjects();
      cleanupRef.current?.();
      initializedRef.current = false;
      ablyRef.current = null;
      cleanupRef.current = null;
    };
  }, []);
}

/** Send a chat message to a project channel. Returns the local message id. */
export function sendMessage(projectId: string, text: string, executionMode: ExecutionMode = "auto"): string {
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
    executionMode,
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
      executionMode,
    } satisfies AblyMessage).then(() => {
      useChatStore.getState().updateStatus(projectId, messageId, "sent");

      // Dual-write: persist user message to server
      const { token: t } = useAuthStore.getState();
      const { apiBaseUrl: url } = useSettingsStore.getState().settings;
      if (t && url) {
        persistMessage(url, t, projectId, {
          id: messageId,
          senderType: "user",
          senderName: username,
          type: "message",
          text,
        });
      }
    }).catch(() => {
      useChatStore.getState().updateStatus(projectId, messageId, "error");
    });
  } else {
    useChatStore.getState().updateStatus(projectId, messageId, "error");
  }

  return messageId;
}
