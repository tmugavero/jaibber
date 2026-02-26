import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useOrgStore } from "@/stores/orgStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/cn";

interface ApiKeyRow {
  id: string;
  prefix: string;
  name: string;
  scopes: string[];
  rateLimitRpm: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  status: "active" | "expired" | "revoked";
}

interface CreatedKey {
  id: string;
  key: string;
  name: string;
  prefix: string;
  scopes: string[];
  snippets: {
    curl: string;
    python: string;
    node: string;
  };
}

type Preset = "read-only" | "agent-operator" | "full-access";

const PRESET_LABELS: Record<Preset, string> = {
  "read-only": "Read Only",
  "agent-operator": "Agent Operator",
  "full-access": "Full Access",
};

const PRESET_DESCRIPTIONS: Record<Preset, string> = {
  "read-only": "Monitoring and dashboards",
  "agent-operator": "Headless agents sending messages",
  "full-access": "Admin automation and management",
};

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ApiKeysSection() {
  const token = useAuthStore((s) => s.token);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const apiBaseUrl = useSettingsStore((s) => s.settings.apiBaseUrl) || "https://jaibber-server.vercel.app";

  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [snippetTab, setSnippetTab] = useState<"curl" | "python" | "node">("curl");

  // Create form state
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<Preset>("agent-operator");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (!activeOrgId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/orgs/${activeOrgId}/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setKeys(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [activeOrgId, token, apiBaseUrl]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    if (!name.trim() || !activeOrgId || !token) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/orgs/${activeOrgId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), preset }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? json.error ?? "Failed to create key");
        return;
      }
      setCreatedKey(json.data);
      setShowCreate(false);
      setName("");
      await fetchKeys();
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!activeOrgId || !token) return;
    await fetch(`${apiBaseUrl}/api/orgs/${activeOrgId}/api-keys/${keyId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchKeys();
  };

  const copyToClipboard = async (text: string, type: "key" | "snippet") => {
    await navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  const inputClass = "w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  // Key just created — show reveal card
  if (createdKey) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">API Key Created</h2>
          <p className="text-sm text-muted-foreground">
            Copy your key now. You won't be able to see it again.
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              {createdKey.name}
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted/60 rounded-lg px-3 py-2.5 text-sm font-mono text-foreground break-all select-all">
                {createdKey.key}
              </code>
              <button
                onClick={() => copyToClipboard(createdKey.key, "key")}
                className="flex-shrink-0 bg-primary text-primary-foreground rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {copiedKey ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Scope badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Scopes:</span>
            <div className="flex flex-wrap gap-1">
              {createdKey.scopes.map((s) => (
                <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/60 text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Code snippets */}
          <div>
            <div className="flex gap-1 mb-2">
              {(["curl", "python", "node"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSnippetTab(t)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    snippetTab === t
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "curl" ? "cURL" : t === "python" ? "Python" : "Node.js"}
                </button>
              ))}
            </div>
            <div className="relative">
              <pre className="bg-muted/60 rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
                {createdKey.snippets[snippetTab]}
              </pre>
              <button
                onClick={() => copyToClipboard(createdKey.snippets[snippetTab], "snippet")}
                className="absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-medium bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                {copiedSnippet ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => setCreatedKey(null)}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          I've saved this key
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">API Keys</h2>
        <p className="text-sm text-muted-foreground">
          Create keys to let agents and scripts interact with Jaibber programmatically.
        </p>
      </div>

      {/* Create form */}
      {showCreate ? (
        <div className="border border-border rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Key name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Agent, CI Pipeline"
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Permission preset
            </label>
            <div className="space-y-2">
              {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg border transition-colors",
                    preset === p
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30",
                  )}
                >
                  <div className="text-sm font-medium text-foreground">{PRESET_LABELS[p]}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{PRESET_DESCRIPTIONS[p]}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {creating ? "Generating..." : "Generate Key"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setError(null); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Create API Key
        </button>
      )}

      {/* Key list */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-4">Loading keys...</div>
      ) : keys.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center">
          <div className="text-muted-foreground text-sm mb-2">No API keys yet</div>
          <div className="text-muted-foreground/60 text-xs">
            Create a key to let agents send messages, register, and interact via HTTP.
          </div>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Prefix</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Last used</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{k.name}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {k.scopes.map((s) => (
                        <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/60 text-muted-foreground">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.prefix}...</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                      k.status === "active" && "bg-emerald-500/10 text-emerald-500",
                      k.status === "expired" && "bg-amber-500/10 text-amber-500",
                      k.status === "revoked" && "bg-destructive/10 text-destructive",
                    )}>
                      {k.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {relativeTime(k.lastUsedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {k.status === "active" && (
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
