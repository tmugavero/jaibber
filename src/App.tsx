import { useEffect, useState } from "react";
import "./App.css";
import { Store } from "@tauri-apps/plugin-store";
import { getSettings } from "@/lib/tauri";
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

        // ── 3. Load settings from Rust (apiBaseUrl, anthropicApiKey, machineName)
        const settings = await getSettings();
        useSettingsStore.getState().setSettings(settings);

        const { apiBaseUrl } = settings;
        if (!apiBaseUrl) {
          // No server URL configured yet — show login to pick it up
          setBootState("login");
          return;
        }

        // ── 4. Validate token against server ──────────────────────────────
        const meRes = await fetch(`${apiBaseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${authData.token}` },
        });
        if (!meRes.ok) {
          await store.delete("auth");
          await store.save();
          setBootState("login");
          return;
        }
        const meData = await meRes.json();
        useAuthStore.getState().setAuth(authData.token, meData.userId, meData.username);

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
      await store.save();

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
