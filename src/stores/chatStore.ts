import { create } from "zustand";
import type { Message } from "@/types/message";

interface ChatStore {
  messages: Record<string, Message[]>;  // key = conversationId
  addMessage: (msg: Message) => void;
  appendChunk: (conversationId: string, messageId: string, chunk: string) => void;
  markDone: (conversationId: string, messageId: string) => void;
  updateStatus: (conversationId: string, messageId: string, status: Message["status"]) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: {},
  addMessage: (msg) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [msg.conversationId]: [...(s.messages[msg.conversationId] ?? []), msg],
      },
    })),
  appendChunk: (conversationId, messageId, chunk) =>
    set((s) => {
      const msgs = s.messages[conversationId] ?? [];
      return {
        messages: {
          ...s.messages,
          [conversationId]: msgs.map((m) =>
            m.id === messageId ? { ...m, text: m.text + chunk } : m
          ),
        },
      };
    }),
  markDone: (conversationId, messageId) =>
    set((s) => {
      const msgs = s.messages[conversationId] ?? [];
      return {
        messages: {
          ...s.messages,
          [conversationId]: msgs.map((m) =>
            m.id === messageId ? { ...m, status: "done" } : m
          ),
        },
      };
    }),
  updateStatus: (conversationId, messageId, status) =>
    set((s) => {
      const msgs = s.messages[conversationId] ?? [];
      return {
        messages: {
          ...s.messages,
          [conversationId]: msgs.map((m) =>
            m.id === messageId ? { ...m, status } : m
          ),
        },
      };
    }),
}));
