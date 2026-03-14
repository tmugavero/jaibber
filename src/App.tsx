import { useEffect, useState } from "react";
import "./App.css";
import { storage, getSettings, saveSettings, isTauri, checkForUpdates } from "@/lib/platform";
import { loadMessages } from "@/lib/chatPersistence";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { useContactStore } from "@/stores/contactStore";
import { useProjectStore } from "@/stores/projectStore";
import { useChatStore } from "@/stores/chatStore";
import { useOrgStore } from "@/stores/orgStore";
import { syncRegistrations } from "@/lib/agentSync";
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
  const [bootWarning, setBootWarning] = useState<string | null>(null);

  // Lock body scroll for the full-screen app experience (Tauri always, web /app route)
  useEffect(() => {
    document.body.classList.add("app-lock");
    return () => document.body.classList.remove("app-lock");
  }, []);

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
            apiBaseUrl = savedUrl || "https://api.jaibber.com";
            const recovered = { ...settings, apiBaseUrl };
            useSettingsStore.getState().setSettings(recovered);
            await saveSettings(recovered);
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
        } catch (e) {
          console.error('[App] loadFromServer failed:', e);
          setBootWarning("Could not load projects from server. Check your connection.");
        }
        try {
          await useOrgStore.getState().loadOrgs(apiBaseUrl, authData.token);
        } catch (e) {
          console.error('[App] loadOrgs failed:', e);
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
            agentProvider: p.agentProvider ?? "claude",
          }));
          useProjectStore.getState().setProjects(migrated);
        }

        // ── 6b. Sync agent registrations with server (non-blocking) ──────
        if (isTauri) {
          syncRegistrations().catch((e) => console.error('[App] syncRegistrations failed:', e.message));
        }

        // ── 7. Load chat history ───────────────────────────────────────────
        const messages = await loadMessages();
        useChatStore.getState().loadMessages(messages);

        setBootState("app");

        // ── 8. Check for updates (desktop only, non-blocking) ────────────
        checkForUpdates();
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

      // Sync agent registrations after login (non-blocking)
      if (isTauri) {
        syncRegistrations().catch((e) => console.error('[App] syncRegistrations failed:', e.message));
      }

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

  return (
    <>
      {bootWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 text-black px-4 py-2 text-sm text-center flex items-center justify-center gap-3">
          <span>{bootWarning}</span>
          <button
            onClick={() => window.location.reload()}
            className="underline font-medium hover:no-underline"
          >
            Retry
          </button>
          <button
            onClick={() => setBootWarning(null)}
            className="ml-2 opacity-70 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      )}
      <AppShell />
    </>
  );
}

export default App;
