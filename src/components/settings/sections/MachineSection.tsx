import { useState } from "react";
import { storage, saveSettings } from "@/lib/platform";
import { useSettingsStore } from "@/stores/settingsStore";
import type { AppSettings } from "@/types/settings";

export function MachineSection() {
  const settings = useSettingsStore((s) => s.settings);
  const [form, setForm] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(form);
      await storage.set("schema_version", 2);
      useSettingsStore.getState().setSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <div className="space-y-8">
      <div>
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
              value={form.machineName}
              onChange={(e) => setForm({ ...form, machineName: e.target.value })}
              placeholder="e.g. dev-laptop, ubuntu-agent"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Anthropic API Key <span className="font-normal opacity-60">(optional)</span>
            </label>
            <input
              type="password"
              value={form.anthropicApiKey ?? ""}
              onChange={(e) => setForm({ ...form, anthropicApiKey: e.target.value || null })}
              placeholder="sk-ant-..."
              className={inputClass + " font-mono"}
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
              className={inputClass + " font-mono"}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {saved ? "Saved!" : saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
