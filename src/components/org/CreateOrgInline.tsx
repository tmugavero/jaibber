import { useState } from "react";
import { useOrgStore } from "@/stores/orgStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  message?: string;
}

export function CreateOrgInline({ message = "Create an organization to get started." }: Props) {
  const { apiBaseUrl } = useSettingsStore((s) => s.settings);
  const token = useAuthStore((s) => s.token);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Organization name is required.");
      return;
    }
    if (!apiBaseUrl || !token) {
      setError("Not authenticated.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await useOrgStore.getState().createOrg(apiBaseUrl, token, trimmed);
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create organization.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center text-center gap-4">
      <div className="text-4xl">🏢</div>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      <div className="w-full max-w-xs space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          placeholder="Organization name"
          className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button
          onClick={handleCreate}
          disabled={busy}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create Organization"}
        </button>
        {error && (
          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>
    </div>
  );
}
