import { create } from "zustand";
import type { Contact } from "@/types/contact";

interface ContactStore {
  contacts: Record<string, Contact>;
  upsertContact: (c: Contact) => void;
  setOnline: (id: string, isOnline: boolean) => void;
  removeContact: (id: string) => void;
}

export const useContactStore = create<ContactStore>((set) => ({
  contacts: {},
  upsertContact: (c) =>
    set((s) => ({ contacts: { ...s.contacts, [c.id]: c } })),
  setOnline: (id, isOnline) =>
    set((s) => {
      const existing = s.contacts[id];
      if (!existing) return s;
      return {
        contacts: {
          ...s.contacts,
          [id]: { ...existing, isOnline, lastSeen: isOnline ? existing.lastSeen : new Date().toISOString() },
        },
      };
    }),
  removeContact: (id) =>
    set((s) => {
      const contacts = { ...s.contacts };
      delete contacts[id];
      return { contacts };
    }),
}));
