import { create } from "zustand";
import type { Contact } from "@/types/contact";

interface ContactStore {
  contacts: Record<string, Contact>;
  loadFromServer: (apiBaseUrl: string, token: string) => Promise<void>;
  upsertContact: (c: Contact) => void;
  setOnline: (id: string, isOnline: boolean) => void;
  removeContact: (id: string) => void;
}

export const useContactStore = create<ContactStore>((set) => ({
  contacts: {},

  loadFromServer: async (apiBaseUrl, token) => {
    const res = await fetch(`${apiBaseUrl}/api/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to load projects: ${res.status}`);
    const { projects } = await res.json();
    const contacts: Record<string, Contact> = {};
    for (const p of projects) {
      contacts[p.id] = {
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        ablyChannelName: p.ablyChannelName,
        isOnline: false,
        lastSeen: null,
        role: p.role,
      };
    }
    set({ contacts });
  },

  upsertContact: (c) =>
    set((s) => ({ contacts: { ...s.contacts, [c.id]: c } })),

  setOnline: (id, isOnline) =>
    set((s) => {
      const existing = s.contacts[id];
      if (!existing) return s;
      return {
        contacts: {
          ...s.contacts,
          [id]: {
            ...existing,
            isOnline,
            lastSeen: isOnline ? existing.lastSeen : new Date().toISOString(),
          },
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
