import { storage } from "@/lib/platform";
import type { Message } from "@/types/message";

const MESSAGES_KEY = "chat_messages";

// Keep a debounce timer so rapid message additions don't thrash disk
let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** Load persisted messages from disk. Returns {} if none saved yet. */
export async function loadMessages(): Promise<Record<string, Message[]>> {
  try {
    const value = await storage.get<Record<string, Message[]>>(MESSAGES_KEY);
    return value ?? {};
  } catch (e) {
    console.warn("Failed to load chat history:", e);
    return {};
  }
}

/** Save messages to disk, debounced by 1s to avoid hammering disk on every keystroke/message */
export function scheduleSave(messages: Record<string, Message[]>) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      // Only persist non-streaming messages (don't save in-flight bubbles)
      const toSave: Record<string, Message[]> = {};
      for (const [convId, msgs] of Object.entries(messages)) {
        toSave[convId] = msgs.filter((m) => m.status !== "streaming" && m.status !== "sending");
      }
      await storage.set(MESSAGES_KEY, toSave);
    } catch (e) {
      console.warn("Failed to save chat history:", e);
    }
  }, 1000);
}
