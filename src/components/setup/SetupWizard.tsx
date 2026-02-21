import { useState } from "react";
import { saveSettings } from "@/lib/tauri";
import { useSettingsStore } from "@/stores/settingsStore";
import type { AppSettings } from "@/types/settings";
import { cn } from "@/lib/cn";

interface Props {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Identity
  const [handle, setHandle] = useState("");
  const [mode, setMode] = useState<"hub" | "agent">("hub");
  const [projectDir, setProjectDir] = useState("");

  // Step 2 — Connect
  const [ablyKey, setAblyKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");

  const handleStep1Next = () => {
    if (!handle.trim()) {
      setError("Please enter a name for this machine.");
      return;
    }
    if (mode === "agent" && !projectDir.trim()) {
      setError("Please enter a project directory.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleLaunch = async () => {
    if (!ablyKey.trim()) {
      setError("Please enter your Ably API key.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const settings: AppSettings = {
        ablyApiKey: ablyKey.trim(),
        anthropicApiKey: anthropicKey.trim() || null,
        myHandle: handle.trim(),
        myMode: mode,
        projectDir: mode === "agent" ? projectDir.trim() : null,
      };
      await saveSettings(settings);
      useSettingsStore.getState().setSettings(settings);
      useSettingsStore.getState().setSetupComplete(true);
      onComplete();
    } catch (e) {
      setError(`Failed to save: ${e}`);
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

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          {([1, 2] as const).map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors flex-shrink-0",
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {s}
              </div>
              <span className={cn("text-xs", step >= s ? "text-foreground" : "text-muted-foreground")}>
                {s === 1 ? "Identity" : "Connect"}
              </span>
              {s < 2 && <div className={cn("h-px flex-1", step > s ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-xl">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Name this machine</h2>
                <p className="text-xs text-muted-foreground">
                  This is how other machines see you. Use something memorable like{" "}
                  <code className="text-primary">dev-laptop</code> or{" "}
                  <code className="text-primary">api-server</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Handle
                </label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/\s/g, "-").toLowerCase())}
                  placeholder="my-laptop"
                  className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["hub", "agent"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        mode === m
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-muted/20 text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <div className="font-semibold text-sm">
                        {m === "hub" ? "🖥️ Hub" : "🤖 Agent"}
                      </div>
                      <div className="text-[11px] mt-0.5 opacity-70">
                        {m === "hub"
                          ? "Send commands to agents"
                          : "Execute Claude commands"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {mode === "agent" && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Project directory
                  </label>
                  <input
                    type="text"
                    value={projectDir}
                    onChange={(e) => setProjectDir(e.target.value)}
                    placeholder="C:\Users\you\Code\my-project"
                    className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              )}

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleStep1Next}
                className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                Continue →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Connect to Ably</h2>
                <p className="text-xs text-muted-foreground">
                  Get a free API key at{" "}
                  <a
                    href="https://ably.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    ably.com
                  </a>{" "}
                  → Apps → API Keys. Paste the full key including the colon.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Ably API Key <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={ablyKey}
                  onChange={(e) => setAblyKey(e.target.value)}
                  placeholder="xVLRLA.XXXXXX:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              {mode === "agent" && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Anthropic API Key{" "}
                    <span className="text-muted-foreground/60">(optional, for agent mode)</span>
                  </label>
                  <input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              )}

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setStep(1); setError(null); }}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground bg-muted/40 hover:bg-muted/60 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleLaunch}
                  disabled={saving}
                  className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-wait"
                >
                  {saving ? "Launching…" : "🚀 Launch Jaibber"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
