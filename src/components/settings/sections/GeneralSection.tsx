import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { storage, saveSettings, isTauri } from "@/lib/platform";
import { useSettingsStore } from "@/stores/settingsStore";

export function GeneralSection() {
  const username = useAuthStore((s) => s.username);
  const settings = useSettingsStore((s) => s.settings);
  const [machineName, setMachineName] = useState(settings.machineName);
  const [anthropicKey, setAnthropicKey] = useState(settings.anthropicApiKey ?? "");
  const [openaiKey, setOpenaiKey] = useState(settings.openaiApiKey ?? "");
  const [googleKey, setGoogleKey] = useState(settings.googleApiKey ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showFallbackKeys, setShowFallbackKeys] = useState(false);

  const handleSignOut = async () => {
    useAuthStore.getState().clearAuth();
    await Promise.race([
      storage.set("auth", null).catch(() => {}),
      new Promise((r) => setTimeout(r, 1000)),
    ]);
    window.location.reload();
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updated = {
        ...settings,
        machineName,
        anthropicApiKey: anthropicKey || null,
        openaiApiKey: openaiKey || null,
        googleApiKey: googleKey || null,
      };
      await saveSettings(updated);
      await storage.set("schema_version", 2);
      useSettingsStore.getState().setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const hasAnyKey = !!(anthropicKey || openaiKey || googleKey);

  const inputClass = "w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Profile</h2>
        <div className="border-b border-border pb-6">
          <div className="flex items-center gap-4 mt-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
              {(username ?? "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-base font-medium text-foreground">{username}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Signed in</div>
            </div>
          </div>
        </div>
      </div>

      {isTauri && (
        <div className="border-b border-border pb-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">This Machine</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Settings specific to this desktop installation.
          </p>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Machine name <span className="font-normal opacity-60">(cosmetic label)</span>
              </label>
              <input
                type="text"
                value={machineName}
                onChange={(e) => setMachineName(e.target.value)}
                placeholder="e.g. dev-laptop, ubuntu-agent"
                className={inputClass}
              />
            </div>

            {/* Fallback API Keys — collapsible */}
            <div>
              <button
                onClick={() => setShowFallbackKeys(!showFallbackKeys)}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform ${showFallbackKeys ? "rotate-90" : ""}`}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
                Fallback API Keys
                {hasAnyKey && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                    configured
                  </span>
                )}
                <span className="font-normal opacity-60">(optional)</span>
              </button>
              <p className="text-[11px] text-muted-foreground/70 mt-1 ml-5">
                Used only if your local CLI auth expires. Your authenticated CLI is always used first.
              </p>

              {showFallbackKeys && (
                <div className="mt-3 ml-5 space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Anthropic <span className="font-normal opacity-60">(Claude)</span>
                    </label>
                    <input
                      type="password"
                      value={anthropicKey}
                      onChange={(e) => setAnthropicKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className={inputClass + " font-mono text-xs"}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      OpenAI <span className="font-normal opacity-60">(Codex)</span>
                    </label>
                    <input
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder="sk-..."
                      className={inputClass + " font-mono text-xs"}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      Google <span className="font-normal opacity-60">(Gemini)</span>
                    </label>
                    <input
                      type="password"
                      value={googleKey}
                      onChange={(e) => setGoogleKey(e.target.value)}
                      placeholder="AIza..."
                      className={inputClass + " font-mono text-xs"}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {saved ? "Saved!" : saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      )}

      <div className="border-b border-border pb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Account</h2>
        <button
          onClick={handleSignOut}
          className="text-sm text-destructive hover:text-destructive/80 transition-colors border border-destructive/30 rounded-lg px-4 py-2"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
