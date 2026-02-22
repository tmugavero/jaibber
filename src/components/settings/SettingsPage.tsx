import { useState } from "react";
import { Store } from "@tauri-apps/plugin-store";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { saveSettings } from "@/lib/tauri";
import type { AppSettings } from "@/types/settings";

export function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const username = useAuthStore((s) => s.username);
  const [form, setForm] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to Rust (for run_claude to pick up anthropicApiKey) and to JS store as fallback
      await saveSettings(form);
      const store = await Store.load("jaibber.json");
      await store.set("schema_version", 2);
      await store.set("app_settings", form);
      await store.save();
      useSettingsStore.getState().setSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    useAuthStore.getState().clearAuth();
    window.location.reload();
  };

  return (
    <div className="p-6 max-w-lg space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Settings</h1>

      {/* Account info */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-medium text-foreground">Account</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">{username}</div>
            <div className="text-xs text-muted-foreground">Signed in</div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs text-destructive hover:text-destructive/80 transition-colors border border-destructive/30 rounded-lg px-3 py-1.5"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Machine settings */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-foreground">This Machine</h2>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Machine name <span className="font-normal opacity-60">(cosmetic label)</span>
          </label>
          <input
            type="text"
            value={form.machineName}
            onChange={(e) => setForm({ ...form, machineName: e.target.value })}
            placeholder="e.g. dev-laptop, ubuntu-agent"
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Anthropic API Key <span className="font-normal opacity-60">(optional — needed to run Claude locally)</span>
          </label>
          <input
            type="password"
            value={form.anthropicApiKey ?? ""}
            onChange={(e) => setForm({ ...form, anthropicApiKey: e.target.value || null })}
            placeholder="sk-ant-..."
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Server URL
          </label>
          <input
            type="text"
            value={form.apiBaseUrl}
            onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value.replace(/\/$/, "") })}
            placeholder="https://jaibber-server.vercel.app"
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {saved ? "Saved!" : saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
