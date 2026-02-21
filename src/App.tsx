import { useEffect, useState } from "react";
import "./App.css";
import { Store } from "@tauri-apps/plugin-store";
import { getSettings, saveSettings } from "@/lib/tauri";
import { loadMessages } from "@/lib/chatPersistence";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { useContactStore } from "@/stores/contactStore";
import { useProjectStore } from "@/stores/projectStore";
import { useChatStore } from "@/stores/chatStore";
import { AppShell } from "@/components/layout/AppShell";
import { LoginScreen } from "@/components/auth/LoginScreen";

// Schema version — bump this to clear stale local data from old app versions
const SCHEMA_VERSION = 2;
const SCHEMA_KEY = "schema_version";

type BootState = "loading" | "login" | "app";

function App() {
  const [bootState, setBootState] = useState<BootState>("loading");

  // Auto-save local projects to disk whenever the list changes
  useEffect(() => {
    return useProjectStore.subscribe(async (state) => {
      const store = await Store.load("jaibber.json");
      await store.set("local_projects", state.projects);
      await store.save();
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // ── 1. Schema version wipe ─────────────────────────────────────────
        // Old versions stored different keys; wipe on first run of v2+
        // Store imported statically at top of file
        const store = await Store.load("jaibber.json");
        const schemaVersion = await store.get<number>(SCHEMA_KEY);
        if (!schemaVersion || schemaVersion < SCHEMA_VERSION) {
          await store.clear();
          await store.set(SCHEMA_KEY, SCHEMA_VERSION);
          await store.save();
        }

        // ── 2. Load persisted auth ─────────────────────────────────────────
        const authData = await store.get<{ token: string; userId: string; username: string }>("auth");
        if (!authData?.token) {
          setBootState("login");
          return;
        }

        // ── 3. Load settings from Rust; fall back to JS store if apiBaseUrl missing
        const settings = await getSettings();
        let { apiBaseUrl } = settings;

        if (!apiBaseUrl) {
          // Rust settings lost (can happen on webview reload) — try JS store fallback
          const savedUrl = await store.get<string>("api_base_url");
          if (savedUrl) {
            apiBaseUrl = savedUrl;
            const recovered = { ...settings, apiBaseUrl: savedUrl };
            useSettingsStore.getState().setSettings(recovered);
            await saveSettings(recovered);
          } else {
            setBootState("login");
            return;
          }
        } else {
          useSettingsStore.getState().setSettings(settings);
        }

        // ── 4. Validate token against server ──────────────────────────────
        // Only force logout on a definitive 401 — network errors keep the user logged in
        try {
          const meRes = await fetch(`${apiBaseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${authData.token}` },
          });
          if (meRes.status === 401 || meRes.status === 403) {
            await store.delete("auth");
            await store.save();
            setBootState("login");
            return;
          }
          if (meRes.ok) {
            const meData = await meRes.json();
            useAuthStore.getState().setAuth(authData.token, meData.userId, meData.username);
          } else {
            // Server error — continue with cached identity
            useAuthStore.getState().setAuth(authData.token, authData.userId, authData.username);
          }
        } catch {
          // Network unreachable — continue with cached identity (offline mode)
          useAuthStore.getState().setAuth(authData.token, authData.userId, authData.username);
        }

        // ── 5. Load contacts (projects) from server ────────────────────────
        await useContactStore.getState().loadFromServer(apiBaseUrl, authData.token);

        // ── 6. Load persisted local projects (agent machine state) ─────────
        const localProjects = await store.get<ReturnType<typeof useProjectStore.getState>["projects"]>("local_projects");
        if (localProjects) {
          useProjectStore.getState().setProjects(localProjects);
        }

        // ── 7. Load chat history ───────────────────────────────────────────
        const messages = await loadMessages();
        useChatStore.getState().loadMessages(messages);

        setBootState("app");
      } catch (e) {
        console.error("Boot error:", e);
        setBootState("login");
      }
    })();
  }, []);

  const handleLogin = async () => {
    // After login, persist auth to store and continue boot
    const auth = useAuthStore.getState();
    const settings = useSettingsStore.getState().settings;
    if (!auth.token || !auth.userId || !auth.username) return;

    try {
      const store = await Store.load("jaibber.json");
      await store.set("auth", { token: auth.token, userId: auth.userId, username: auth.username });
      await store.set("api_base_url", settings.apiBaseUrl);
      await store.save();
      await saveSettings(settings);

      // Load contacts with the new token
      if (settings.apiBaseUrl) {
        await useContactStore.getState().loadFromServer(settings.apiBaseUrl, auth.token);
      }

      const messages = await loadMessages();
      useChatStore.getState().loadMessages(messages);

      setBootState("app");
    } catch (e) {
      console.error("Post-login error:", e);
    }
  };

  if (bootState === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-muted-foreground text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  if (bootState === "login") {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <AppShell />;
}

export default App;
