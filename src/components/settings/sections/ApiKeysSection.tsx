import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useOrgStore } from "@/stores/orgStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useContactStore } from "@/stores/contactStore";
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
  "read-only": "Read message history and agent status (dashboards, monitoring)",
  "agent-operator": "Send and read messages (AI agents, CI pipelines, webhooks)",
  "full-access": "Full control including agent management (admin automation)",
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
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null);
  const [detailSnippetTab, setDetailSnippetTab] = useState<"curl" | "python" | "node">("curl");
  const [copiedDetailSnippet, setCopiedDetailSnippet] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [guideTab, setGuideTab] = useState<"agent" | "integration">("agent");
  const [copiedGuide, setCopiedGuide] = useState(false);

  const contacts = useContactStore((s) => s.contacts);
  const orgProjects = useMemo(
    () => Object.values(contacts).filter((c) => c.orgId === activeOrgId),
    [contacts, activeOrgId],
  );
  const orphanedProjects = useMemo(
    () => Object.values(contacts).filter((c) => !c.orgId),
    [contacts],
  );
  const [movingProjectId, setMovingProjectId] = useState<string | null>(null);

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

  const handleDelete = async (keyId: string) => {
    if (!activeOrgId || !token) return;
    setDeletingKeyId(keyId);
    try {
      await fetch(`${apiBaseUrl}/api/orgs/${activeOrgId}/api-keys/${keyId}?permanent=true`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (expandedKeyId === keyId) setExpandedKeyId(null);
      await fetchKeys();
    } finally {
      setDeletingKeyId(null);
    }
  };

  const buildSnippets = (prefix: string) => {
    const keyPlaceholder = `${prefix}...`;
    const projectPlaceholder = "{PROJECT_ID}";
    return {
      curl: `curl -X POST ${apiBaseUrl}/api/projects/${projectPlaceholder}/messages \\\n  -H 'X-API-Key: ${keyPlaceholder}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"text": "Hello from my agent"}'`,
      python: `import requests\n\nresponse = requests.post(\n    '${apiBaseUrl}/api/projects/${projectPlaceholder}/messages',\n    headers={'X-API-Key': '${keyPlaceholder}'},\n    json={'text': 'Hello from my agent'}\n)`,
      node: `const response = await fetch(\n  '${apiBaseUrl}/api/projects/${projectPlaceholder}/messages',\n  {\n    method: 'POST',\n    headers: { 'X-API-Key': '${keyPlaceholder}', 'Content-Type': 'application/json' },\n    body: JSON.stringify({ text: 'Hello from my agent' })\n  }\n);`,
    };
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

  const handleMoveToOrg = async (projectId: string) => {
    if (!activeOrgId || !token) return;
    setMovingProjectId(projectId);
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId: activeOrgId }),
      });
      if (res.ok) {
        // Update the contact in store with the new orgId
        const contact = contacts[projectId];
        if (contact) {
          useContactStore.getState().upsertContact({ ...contact, orgId: activeOrgId });
        }
      }
    } finally {
      setMovingProjectId(null);
    }
  };

  const inputClass = "w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  // Key just created — show reveal card
  if (createdKey) {
    const activeSnippet = selectedProjectId
      ? createdKey.snippets[snippetTab].replace(/\{PROJECT_ID\}/g, selectedProjectId)
      : createdKey.snippets[snippetTab];

    const projectLabel = selectedProjectId
      ? orgProjects.find((p) => p.id === selectedProjectId)?.name ?? "project"
      : "{PROJECT_NAME}";

    const agentGuideText = [
      `## Jaibber Integration`,
      ``,
      `Report progress to the team by posting to the "${projectLabel}" project channel.`,
      ``,
      `Endpoint: POST ${apiBaseUrl}/api/projects/${selectedProjectId || "{PROJECT_ID}"}/messages`,
      ``,
      `Headers:`,
      `  X-API-Key: ${createdKey.key}`,
      `  Content-Type: application/json`,
      ``,
      `Body: { "text": "your message", "senderName": "AgentName" }`,
      ``,
      `Example using curl:`,
      `  curl -X POST ${apiBaseUrl}/api/projects/${selectedProjectId || "{PROJECT_ID}"}/messages \\`,
      `    -H 'X-API-Key: ${createdKey.key}' \\`,
      `    -H 'Content-Type: application/json' \\`,
      `    -d '{"text": "Task completed successfully", "senderName": "Agent"}'`,
      ``,
      `Use this after completing tasks, encountering errors, or when you need team input.`,
      `Post concise status updates — the team sees them in real time.`,
    ].join("\n");

    const handleCopyGuide = async () => {
      try {
        await navigator.clipboard.writeText(agentGuideText);
      } catch {
        const input = document.createElement("textarea");
        input.value = agentGuideText;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopiedGuide(true);
      setTimeout(() => setCopiedGuide(false), 2000);
    };

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

          {/* Project selector */}
          {orgProjects.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Select a project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="">-- Select project --</option>
                {orgProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {!selectedProjectId && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Pick a project to fill in the snippets below with a real project ID.
                </p>
              )}
            </div>
          )}

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
                {activeSnippet}
              </pre>
              <button
                onClick={() => copyToClipboard(activeSnippet, "snippet")}
                className="absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-medium bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                {copiedSnippet ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Start guide */}
        <div className="border border-border rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Quick Start</h3>
            <p className="text-xs text-muted-foreground">
              Choose how you want to use this key.
            </p>
          </div>

          <div className="flex gap-1">
            {(["agent", "integration"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setGuideTab(t)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  guideTab === t
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "agent" ? "Agent Setup" : "Webhook / Script"}
              </button>
            ))}
          </div>

          {guideTab === "agent" ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Paste these instructions into your agent's CLAUDE.md, system prompt, or configuration file.
                The agent will use the API key to post status updates into the project channel.
              </p>
              <div className="relative">
                <pre className="bg-muted/60 rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
                  {agentGuideText}
                </pre>
                <button
                  onClick={handleCopyGuide}
                  className="absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-medium bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedGuide ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Send messages from CI pipelines, monitoring tools, or any HTTP client.
                Messages appear instantly in the project channel for all members.
              </p>
              <div className="text-xs text-muted-foreground space-y-2">
                <div>
                  <span className="font-medium text-foreground">Endpoint: </span>
                  <code className="bg-muted/40 rounded px-1.5 py-0.5 font-mono text-[11px]">
                    POST {apiBaseUrl}/api/projects/{selectedProjectId || "{PROJECT_ID}"}/messages
                  </code>
                </div>
                <div>
                  <span className="font-medium text-foreground">Header: </span>
                  <code className="bg-muted/40 rounded px-1.5 py-0.5 font-mono text-[11px]">
                    X-API-Key: {createdKey.prefix}...
                  </code>
                </div>
                <div>
                  <span className="font-medium text-foreground">Body: </span>
                  <code className="bg-muted/40 rounded px-1.5 py-0.5 font-mono text-[11px]">
                    {'{ "text": "...", "senderName": "CI Bot" }'}
                  </code>
                </div>
                <p className="text-[11px]">
                  The <code className="font-mono">senderName</code> field controls who the message appears from (defaults to "API").
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Projects in this org */}
        {orgProjects.length > 0 && (
          <div className="border border-border rounded-xl p-5 space-y-3">
            <div className="text-xs font-medium text-muted-foreground">
              Projects in this org ({orgProjects.length})
            </div>
            <div className="space-y-1.5">
              {orgProjects.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="text-foreground font-medium truncate max-w-[140px]">{p.name}</span>
                  <code className="text-muted-foreground font-mono text-[10px] truncate flex-1">{p.id}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orphaned projects */}
        {orphanedProjects.length > 0 && (
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-5 space-y-3">
            <div className="text-xs font-medium text-amber-500">
              Projects not in any org ({orphanedProjects.length})
            </div>
            <p className="text-[11px] text-muted-foreground">
              These projects can't be accessed via API key. Move them into this org to use them with your keys.
            </p>
            <div className="space-y-2">
              {orphanedProjects.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="text-foreground font-medium truncate max-w-[140px]">{p.name}</span>
                  <code className="text-muted-foreground font-mono text-[10px] truncate flex-1">{p.id}</code>
                  <button
                    onClick={() => handleMoveToOrg(p.id)}
                    disabled={movingProjectId === p.id}
                    className="flex-shrink-0 text-[11px] text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                  >
                    {movingProjectId === p.id ? "Moving..." : "Move to org"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
              {keys.map((k) => {
                const isExpanded = expandedKeyId === k.id;
                const snippets = buildSnippets(k.prefix);
                return (
                  <tr key={k.id} className="border-b border-border last:border-0">
                    <td colSpan={5} className="p-0">
                      {/* Main row */}
                      <div
                        className="flex items-center cursor-pointer hover:bg-muted/10 transition-colors"
                        onClick={() => setExpandedKeyId(isExpanded ? null : k.id)}
                      >
                        <div className="px-4 py-3 flex-1 min-w-0">
                          <div className="font-medium text-foreground">{k.name}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {k.scopes.map((s) => (
                              <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/60 text-muted-foreground">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{k.prefix}...</div>
                        <div className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap",
                            k.status === "active" && "bg-emerald-500/10 text-emerald-500",
                            k.status === "expired" && "bg-amber-500/10 text-amber-500",
                            k.status === "revoked" && "bg-destructive/10 text-destructive",
                          )}>
                            {k.status}
                          </span>
                        </div>
                        <div className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {relativeTime(k.lastUsedAt)}
                        </div>
                        <div className="px-4 py-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {k.status === "active" && (
                            <button
                              onClick={() => handleRevoke(k.id)}
                              className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                            >
                              Revoke
                            </button>
                          )}
                          {k.status === "revoked" && (
                            <button
                              onClick={() => handleDelete(k.id)}
                              disabled={deletingKeyId === k.id}
                              className="text-xs text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
                            >
                              {deletingKeyId === k.id ? "Deleting..." : "Delete"}
                            </button>
                          )}
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")}
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t border-border bg-muted/5 px-4 py-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Created</span>
                              <div className="text-foreground mt-0.5">{new Date(k.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Rate limit</span>
                              <div className="text-foreground mt-0.5">{k.rateLimitRpm} RPM</div>
                            </div>
                            {k.expiresAt && (
                              <div>
                                <span className="text-muted-foreground">Expires</span>
                                <div className="text-foreground mt-0.5">{new Date(k.expiresAt).toLocaleDateString()}</div>
                              </div>
                            )}
                            {k.revokedAt && (
                              <div>
                                <span className="text-muted-foreground">Revoked</span>
                                <div className="text-foreground mt-0.5">{new Date(k.revokedAt).toLocaleDateString()}</div>
                              </div>
                            )}
                          </div>

                          {/* Code snippets with prefix placeholder */}
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                              Code snippets <span className="text-[10px] font-normal">(replace {k.prefix}... with your full key)</span>
                            </div>
                            <div className="flex gap-1 mb-2">
                              {(["curl", "python", "node"] as const).map((t) => (
                                <button
                                  key={t}
                                  onClick={() => setDetailSnippetTab(t)}
                                  className={cn(
                                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                                    detailSnippetTab === t
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
                                {snippets[detailSnippetTab]}
                              </pre>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(snippets[detailSnippetTab]);
                                  setCopiedDetailSnippet(true);
                                  setTimeout(() => setCopiedDetailSnippet(false), 2000);
                                }}
                                className="absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-medium bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {copiedDetailSnippet ? "Copied!" : "Copy"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
