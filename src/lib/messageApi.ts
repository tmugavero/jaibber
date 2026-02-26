import type { Message } from "@/types/message";

interface ServerMessage {
  id: string;
  projectId: string;
  senderId: string;
  senderType: "user" | "agent" | "api";
  senderName: string;
  type: "message" | "response" | "error" | "system";
  text: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface ServerMessagePage {
  data: ServerMessage[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    links: { self: string; next?: string };
  };
}

function mapServerMessage(msg: ServerMessage, currentUserId: string): Message {
  return {
    id: msg.id,
    conversationId: msg.projectId,
    sender: msg.senderId === currentUserId ? "me" : "them",
    senderName: msg.senderName,
    text: msg.text,
    timestamp: msg.createdAt,
    status: msg.type === "error" ? "error" : "done",
  };
}

/** Fetch paginated message history from the server. */
export async function fetchMessages(
  apiBaseUrl: string,
  token: string,
  projectId: string,
  currentUserId: string,
  options?: { limit?: number; before?: string },
): Promise<{ messages: Message[]; hasMore: boolean; cursor: string | null }> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.before) params.set("before", options.before);

  const qs = params.toString();
  const url = `${apiBaseUrl}/api/projects/${projectId}/messages${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return { messages: [], hasMore: false, cursor: null };

  const page: ServerMessagePage = await res.json();
  const messages = page.data.map((m) => mapServerMessage(m, currentUserId));

  return {
    messages,
    hasMore: page.pagination.hasMore,
    cursor: page.pagination.cursor,
  };
}

/** Fire-and-forget persist a message to the server. */
export function persistMessage(
  apiBaseUrl: string,
  token: string,
  projectId: string,
  message: {
    id: string;
    senderType: "user" | "agent";
    senderName: string;
    type: "message" | "response" | "error";
    text: string;
  },
): void {
  fetch(`${apiBaseUrl}/api/projects/${projectId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: message.id,
      senderType: message.senderType,
      senderName: message.senderName,
      type: message.type,
      text: message.text,
    }),
  }).catch(() => {});
}
