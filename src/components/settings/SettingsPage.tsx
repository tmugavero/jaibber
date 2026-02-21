import { useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { saveSettings } from "@/lib/tauri";
import type { AppSettings } from "@/types/settings";

export function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const [form, setForm] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(form);
      useSettingsStore.getState().setSettings(form);
      setSaved(true);
      // Reload the app so Ably reconnects with the new handle
      setTimeout(() => window.location.reload(), 1000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-lg space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Settings</h1>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Handle (machine name)
          </label>
          <input
            type="text"
            value={form.myHandle}
            onChange={(e) => setForm({ ...form, myHandle: e.target.value })}
            placeholder="e.g. my-laptop, ubuntu-agent"
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Mode
          </label>
          <select
            value={form.myMode}
            onChange={(e) => setForm({ ...form, myMode: e.target.value as "hub" | "agent" })}
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="hub">Hub — send commands to agents</option>
            <option value="agent">Agent — execute Claude commands</option>
          </select>
        </div>

        {form.myMode === "agent" && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Project directory
            </label>
            <input
              type="text"
              value={form.projectDir ?? ""}
              onChange={(e) => setForm({ ...form, projectDir: e.target.value || null })}
              placeholder="/home/user/Code/my-project"
              className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Ably API Key
          </label>
          <input
            type="text"
            value={form.ablyApiKey ?? ""}
            onChange={(e) => setForm({ ...form, ablyApiKey: e.target.value || null })}
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Anthropic API Key <span className="font-normal opacity-60">(optional — agent mode only)</span>
          </label>
          <input
            type="password"
            value={form.anthropicApiKey ?? ""}
            onChange={(e) => setForm({ ...form, anthropicApiKey: e.target.value || null })}
            placeholder="sk-ant-..."
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {saved ? "Saved — reloading…" : saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
