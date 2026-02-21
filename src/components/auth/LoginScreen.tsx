import { useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { saveSettings } from "@/lib/tauri";
import { cn } from "@/lib/cn";

interface Props {
  onLogin: () => void;
}

type Tab = "credentials" | "github";

export function LoginScreen({ onLogin }: Props) {
  const [tab, setTab] = useState<Tab>("credentials");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Credentials form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // GitHub token paste
  const [githubToken, setGithubToken] = useState("");

  // API base URL (editable so users can point to their own deployment)
  const [apiBaseUrl, setApiBaseUrl] = useState(
    useSettingsStore.getState().settings.apiBaseUrl || "https://jaibber-server.vercel.app"
  );

  const handleCredentialsLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      useAuthStore.getState().setAuth(data.token, data.userId, data.username);
      const updatedSettings = { ...useSettingsStore.getState().settings, apiBaseUrl };
      useSettingsStore.getState().setSettings(updatedSettings);
      await saveSettings(updatedSettings);
      onLogin();
    } catch (e) {
      setError(`Network error: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleGithubOpen = async () => {
    try {
      await open(`${apiBaseUrl}/api/auth/github/start`);
    } catch (e) {
      setError(`Could not open browser: ${e}`);
    }
  };

  const handleGithubTokenSubmit = async () => {
    const trimmed = githubToken.trim();
    if (!trimmed) {
      setError("Paste the token from the browser page.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Validate the token against /api/auth/me
      const res = await fetch(`${apiBaseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError("Invalid token. Make sure you copied the full token from the browser.");
        return;
      }
      useAuthStore.getState().setAuth(trimmed, data.userId, data.username);
      const updatedSettings = { ...useSettingsStore.getState().settings, apiBaseUrl };
      useSettingsStore.getState().setSettings(updatedSettings);
      await saveSettings(updatedSettings);
      onLogin();
    } catch (e) {
      setError(`Network error: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚡</div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Jaibber</h1>
          <p className="text-muted-foreground mt-1 text-sm">Chat with Claude Code agents anywhere</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-xl space-y-4">
          {/* API base URL */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Server URL
            </label>
            <input
              type="text"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value.replace(/\/$/, ""))}
              placeholder="https://jaibber-server.vercel.app"
              className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
            {(["credentials", "github"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); }}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
                  tab === t
                    ? "bg-card shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "credentials" ? "Username & Password" : "GitHub"}
              </button>
            ))}
          </div>

          {tab === "credentials" ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your-username"
                  autoComplete="username"
                  className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  onKeyDown={(e) => { if (e.key === "Enter") handleCredentialsLogin(); }}
                  className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <button
                onClick={handleCredentialsLogin}
                disabled={saving}
                className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-wait"
              >
                {saving ? "Signing in…" : "Sign in"}
              </button>
              <p className="text-xs text-center text-muted-foreground">
                No account?{" "}
                <button
                  onClick={async () => {
                    if (!username.trim() || !password.trim()) {
                      setError("Enter a username and password to register.");
                      return;
                    }
                    setSaving(true);
                    setError(null);
                    try {
                      const res = await fetch(`${apiBaseUrl}/api/auth/register`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ username: username.trim(), password }),
                      });
                      const data = await res.json();
                      if (!res.ok) { setError(data.error ?? "Registration failed."); return; }
                      // Auto-login after registration
                      await handleCredentialsLogin();
                    } catch (e) {
                      setError(`Network error: ${e}`);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="text-primary hover:underline"
                >
                  Register
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                1. Click the button below to open GitHub in your browser.
                <br />
                2. Authorize Jaibber.
                <br />
                3. Copy the token shown on the page and paste it below.
              </p>
              <button
                onClick={handleGithubOpen}
                className="w-full border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted/40 transition-colors flex items-center justify-center gap-2"
              >
                <svg height="16" viewBox="0 0 16 16" width="16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                Open GitHub in Browser
              </button>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Paste token from browser
                </label>
                <textarea
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiJ9…"
                  rows={3}
                  className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                />
              </div>
              <button
                onClick={handleGithubTokenSubmit}
                disabled={saving}
                className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-wait"
              >
                {saving ? "Verifying…" : "Continue with GitHub token"}
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
