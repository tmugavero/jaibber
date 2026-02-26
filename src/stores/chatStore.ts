import { create } from "zustand";
import type { Message } from "@/types/message";
import { scheduleSave } from "@/lib/chatPersistence";

interface ChatStore {
  messages: Record<string, Message[]>;  // key = conversationId
  loadMessages: (messages: Record<string, Message[]>) => void;
  addMessage: (msg: Message) => void;
  replaceMessage: (conversationId: string, messageId: string, text: string, status: Message["status"]) => void;
  appendChunk: (conversationId: string, messageId: string, chunk: string) => void;
  markDone: (conversationId: string, messageId: string) => void;
  updateStatus: (conversationId: string, messageId: string, status: Message["status"]) => void;
  mergeServerMessages: (conversationId: string, serverMessages: Message[]) => void;
  clearConversation: (conversationId: string) => void;
}

function withSave(messages: Record<string, Message[]>): Record<string, Message[]> {
  scheduleSave(messages);
  return messages;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: {},
  loadMessages: (messages) =>
    set({ messages }),
  addMessage: (msg) =>
    set((s) => {
      const existing = s.messages[msg.conversationId] ?? [];
      // Dedup by messageId — Ably delivers messages to the publisher too, causing doubles
      if (existing.some((m) => m.id === msg.id)) return s;
      const updated = {
        ...s.messages,
        [msg.conversationId]: [...existing, msg],
      };
      return { messages: withSave(updated) };
    }),
  replaceMessage: (conversationId, messageId, text, status) =>
    set((s) => {
      const msgs = s.messages[conversationId] ?? [];
      const updated: Record<string, Message[]> = {
        ...s.messages,
        [conversationId]: msgs.map((m) =>
          m.id === messageId ? { ...m, text, status } : m
        ),
      };
      return { messages: withSave(updated) };
    }),
  appendChunk: (conversationId, messageId, chunk) =>
    set((s) => {
      const msgs = s.messages[conversationId] ?? [];
      const updated: Record<string, Message[]> = {
        ...s.messages,
        [conversationId]: msgs.map((m) =>
          m.id === messageId ? { ...m, text: m.text + chunk } : m
        ),
      };
      return { messages: withSave(updated) };
    }),
  markDone: (conversationId, messageId) =>
    set((s) => {
      const msgs = s.messages[conversationId] ?? [];
      const updated: Record<string, Message[]> = {
        ...s.messages,
        [conversationId]: msgs.map((m) =>
          m.id === messageId ? { ...m, status: "done" as const } : m
        ),
      };
      return { messages: withSave(updated) };
    }),
  updateStatus: (conversationId, messageId, status) =>
    set((s) => {
      const msgs = s.messages[conversationId] ?? [];
      const updated: Record<string, Message[]> = {
        ...s.messages,
        [conversationId]: msgs.map((m) =>
          m.id === messageId ? { ...m, status } : m
        ),
      };
      return { messages: withSave(updated) };
    }),
  mergeServerMessages: (conversationId, serverMessages) =>
    set((s) => {
      const local = s.messages[conversationId] ?? [];
      const localIds = new Set(local.map((m) => m.id));
      const newFromServer = serverMessages.filter((m) => !localIds.has(m.id));
      if (newFromServer.length === 0) return s;
      const merged = [...newFromServer, ...local].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      const updated = { ...s.messages, [conversationId]: merged };
      return { messages: withSave(updated) };
    }),
  clearConversation: (conversationId) =>
    set((s) => {
      const { [conversationId]: _, ...rest } = s.messages;
      return { messages: withSave(rest) };
    }),
}));
