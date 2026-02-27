/**
 * Platform abstraction layer — lets the same React app run in both
 * Tauri (desktop) and plain browser (web) environments.
 *
 * Tauri: uses invoke() for commands, tauri-plugin-store for persistence
 * Web:   uses localStorage for persistence, server API for settings
 */
import type { AppSettings } from "@/types/settings";

export const isTauri = "__TAURI_INTERNALS__" in window;

// ── Storage abstraction ──────────────────────────────────────────────

const LS_PREFIX = "jaibber:";

async function tauriStoreLoad() {
  const { Store } = await import("@tauri-apps/plugin-store");
  return Store.load("jaibber.json");
}

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    if (isTauri) {
      const store = await tauriStoreLoad();
      const val = await store.get<T>(key);
      return val !== undefined ? val : null;
    }
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    if (isTauri) {
      const store = await tauriStoreLoad();
      await store.set(key, value);
      await store.save();
      return;
    }
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  },

  async delete(key: string): Promise<void> {
    if (isTauri) {
      const store = await tauriStoreLoad();
      await store.delete(key);
      await store.save();
      return;
    }
    localStorage.removeItem(LS_PREFIX + key);
  },

  async clear(): Promise<void> {
    if (isTauri) {
      const store = await tauriStoreLoad();
      await store.clear();
      await store.save();
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(LS_PREFIX)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  },
};

// ── Settings ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  anthropicApiKey: null,
  openaiApiKey: null,
  googleApiKey: null,
  machineName: "",
  apiBaseUrl: "https://jaibber-server.vercel.app",
};

export async function getSettings(): Promise<AppSettings> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<AppSettings>("get_settings");
  }
  // Web: settings live in localStorage
  const saved = await storage.get<AppSettings>("app_settings");
  return saved ?? { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke<void>("save_settings", { settings });
  }
  // Always persist to storage as fallback (Tauri: JS store backup, Web: primary)
  await storage.set("app_settings", settings);
}

// ── Agent execution ──────────────────────────────────────────────────

export async function runAgent(
  prompt: string,
  projectDir: string,
  agentProvider?: string,
  customCommand?: string,
): Promise<string> {
  if (!isTauri) {
    throw new Error("Agent execution is only available on desktop agent machines.");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("run_agent", { prompt, projectDir, agentProvider, customCommand });
}

export async function runAgentStream(params: {
  prompt: string;
  projectDir: string;
  responseId: string;
  systemPrompt: string;
  conversationContext: string;
  agentProvider?: string;
  customCommand?: string;
}): Promise<void> {
  if (!isTauri) {
    throw new Error("Agent streaming is only available on desktop agent machines.");
  }
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke<void>("run_agent_stream", params);
}

// ── Shell (open URL) ─────────────────────────────────────────────────

export async function openUrl(url: string): Promise<void> {
  if (isTauri) {
    const { open } = await import("@tauri-apps/plugin-shell");
    await open(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

// ── Tauri event listener (no-op on web) ──────────────────────────────

export async function listenEvent<T>(
  event: string,
  handler: (payload: T) => void
): Promise<() => void> {
  if (!isTauri) {
    return () => {}; // no-op cleanup
  }
  const { listen } = await import("@tauri-apps/api/event");
  return listen<T>(event, (e) => handler(e.payload));
}
