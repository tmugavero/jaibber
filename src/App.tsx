import { useEffect, useState } from "react";
import "./App.css";
import { storage, getSettings, saveSettings, isTauri } from "@/lib/platform";
import { loadMessages } from "@/lib/chatPersistence";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { useContactStore } from "@/stores/contactStore";
import { useProjectStore } from "@/stores/projectStore";
import { useChatStore } from "@/stores/chatStore";
import { useOrgStore } from "@/stores/orgStore";
import { AppShell } from "@/components/layout/AppShell";
import { LoginScreen } from "@/components/auth/LoginScreen";

// Schema version — bump this to clear stale local data from old app versions
const SCHEMA_VERSION = 2;
const SCHEMA_KEY = "schema_version";

type BootState = "loading" | "login" | "app";

interface AppProps {
  /** Web router calls this when App needs to redirect to login */
  onRequireLogin?: () => void;
}

function App({ onRequireLogin }: AppProps = {}) {
  const [bootState, setBootState] = useState<BootState>("loading");

  // Auto-save local projects to disk whenever the list changes
  useEffect(() => {
    return useProjectStore.subscribe(async (state) => {
      await storage.set(SCHEMA_KEY, SCHEMA_VERSION);
      await storage.set("local_projects", state.projects);
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // ── 1. Schema version wipe ─────────────────────────────────────────
        const schemaVersion = await storage.get<number>(SCHEMA_KEY);
        if (schemaVersion != null && schemaVersion < SCHEMA_VERSION) {
          await storage.clear();
          await storage.set(SCHEMA_KEY, SCHEMA_VERSION);
        } else if (schemaVersion === null) {
          await storage.set(SCHEMA_KEY, SCHEMA_VERSION);
        }

        // ── 2. Load persisted auth ─────────────────────────────────────────
        const authData = await storage.get<{ token: string; userId: string; username: string }>("auth");
        if (!authData?.token) {
          setBootState("login");
          return;
        }

        // ── 3. Load settings from Rust (Tauri) or localStorage (web)
        const settings = await getSettings();
        let { apiBaseUrl } = settings;

        if (!apiBaseUrl) {
          const savedSettings = await storage.get<typeof settings>("app_settings");
          if (savedSettings?.apiBaseUrl) {
            apiBaseUrl = savedSettings.apiBaseUrl;
            useSettingsStore.getState().setSettings(savedSettings);
            await saveSettings(savedSettings);
          } else {
            const savedUrl = await storage.get<string>("api_base_url");
            if (savedUrl) {
              apiBaseUrl = savedUrl;
              const recovered = { ...settings, apiBaseUrl: savedUrl };
              useSettingsStore.getState().setSettings(recovered);
              await saveSettings(recovered);
            } else {
              setBootState("login");
              return;
            }
          }
        } else {
          useSettingsStore.getState().setSettings(settings);
        }

        // ── 4. Validate token against server ──────────────────────────────
        try {
          const meRes = await fetch(`${apiBaseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${authData.token}` },
          });
          if (meRes.status === 401 || meRes.status === 403) {
            await storage.delete("auth");
            setBootState("login");
            return;
          }
          if (meRes.ok) {
            const meData = await meRes.json();
            useAuthStore.getState().setAuth(authData.token, meData.userId, meData.username);
          } else {
            useAuthStore.getState().setAuth(authData.token, authData.userId, authData.username);
          }
        } catch {
          useAuthStore.getState().setAuth(authData.token, authData.userId, authData.username);
        }

        // ── 5. Load contacts (projects) and orgs from server ──────────────
        try {
          await useContactStore.getState().loadFromServer(apiBaseUrl, authData.token);
        } catch {
          // Continue — contacts will be empty but user stays logged in
        }
        try {
          await useOrgStore.getState().loadOrgs(apiBaseUrl, authData.token);
        } catch {
          // Continue — orgs will be empty
        }

        // ── 6. Load persisted local projects (agent machine state) ─────────
        const localProjects = await storage.get<ReturnType<typeof useProjectStore.getState>["projects"]>("local_projects");
        if (localProjects) {
          // Migrate old projects that lack agentName/agentInstructions
          const machineName = useSettingsStore.getState().settings.machineName || "Agent";
          const migrated = localProjects.map((p) => ({
            ...p,
            agentName: p.agentName || machineName,
            agentInstructions: p.agentInstructions ?? "",
          }));
          useProjectStore.getState().setProjects(migrated);
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
    const auth = useAuthStore.getState();
    const settings = useSettingsStore.getState().settings;
    if (!auth.token || !auth.userId || !auth.username) return;

    try {
      await storage.set(SCHEMA_KEY, SCHEMA_VERSION);
      await storage.set("auth", { token: auth.token, userId: auth.userId, username: auth.username });
      await storage.set("api_base_url", settings.apiBaseUrl);
      await saveSettings(settings);

      if (settings.apiBaseUrl) {
        try {
          await useContactStore.getState().loadFromServer(settings.apiBaseUrl, auth.token);
        } catch {
          // Network hiccup — continue, contacts will be empty
        }
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
    // When running inside web router, redirect to login page instead of rendering inline
    if (!isTauri && onRequireLogin) {
      onRequireLogin();
      return (
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="text-muted-foreground text-sm animate-pulse">Redirecting…</div>
        </div>
      );
    }
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <AppShell />;
}

export default App;
