import { useState } from "react";
import { storage, isTauri } from "@/lib/platform";
import { useProjectStore } from "@/stores/projectStore";
import { useContactStore } from "@/stores/contactStore";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useOrgStore } from "@/stores/orgStore";
import { getAbly } from "@/lib/ably";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { LocalProject } from "@/stores/projectStore";
import type { Contact } from "@/types/contact";

async function saveProjects(projects: LocalProject[]) {
  await storage.set("local_projects", projects);
}

const PROVIDER_OPTIONS = [
  { value: "claude", label: "Claude" },
  { value: "codex", label: "Codex" },
  { value: "gemini", label: "Gemini" },
  { value: "openclaw", label: "OpenClaw" },
  { value: "custom", label: "Custom" },
] as const;

/** Strip disallowed chars from agent names so @mentions work (e.g. "Coding Agent!" → "CodingAgent") */
function sanitizeAgentName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "");
}

const PROVIDER_LABELS: Record<string, string> = {
  claude: "Claude",
  codex: "Codex",
  gemini: "Gemini",
  openclaw: "OpenClaw",
  custom: "Custom",
};

function ProviderSelect({ value, onChange, inputClass }: { value: string; onChange: (v: string) => void; inputClass: string }) {
  return (
    <div>
      <label className="block text-[10px] text-muted-foreground mb-0.5">Agent backend</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass + " text-xs"}
      >
        {PROVIDER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface ProjectInvite {
  id: string;
  token: string;
  role: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
}

function ProjectCard({ contact }: { contact: Contact }) {
  const allLocalProjects = useProjectStore((s) => s.projects);
  const messages = useChatStore((s) => s.messages[contact.id]);
  const localAgents = allLocalProjects.filter((p) => p.projectId === contact.id);
  const msgCount = messages?.length ?? 0;
  const agents = contact.onlineAgents ?? [];

  // Track which agent is being edited (by agentName), or null if none
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [editAgentName, setEditAgentName] = useState("");
  const [editAgentInstructions, setEditAgentInstructions] = useState("");
  const [editAgentProvider, setEditAgentProvider] = useState("claude");
  const [editCustomCommand, setEditCustomCommand] = useState("");

  // Link state for registering a new agent on this machine
  const [linking, setLinking] = useState(false);
  const [linkDir, setLinkDir] = useState("");
  const [linkAgentName, setLinkAgentName] = useState("");
  const [linkAgentInstructions, setLinkAgentInstructions] = useState("");
  const [linkAgentProvider, setLinkAgentProvider] = useState("claude");
  const [linkCustomCommand, setLinkCustomCommand] = useState("");

  // Invite link state
  const [showInvites, setShowInvites] = useState(false);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const [joining, setJoining] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; onConfirm: () => void; variant?: "destructive" } | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const defaultAgentName = useSettingsStore.getState().settings.machineName || "Agent";

  /** Check if an agent name conflicts with existing agents in this project. */
  const isNameTaken = (name: string, excludeCurrentName?: string): boolean => {
    const lower = name.toLowerCase();
    // Check local agents on this machine
    const localConflict = localAgents.some(
      (a) => a.agentName.toLowerCase() === lower && a.agentName !== excludeCurrentName
    );
    if (localConflict) return true;
    // Check online agents from other machines
    return agents.some((a) => a.agentName.toLowerCase() === lower);
  };
  const currentUserId = useAuthStore((s) => s.userId);
  const isAdmin = contact.role === "admin";
  const isOrgAdmin = contact.role === "org-admin";
  const isCreator = contact.ownerId != null && contact.ownerId === currentUserId;
  const roleLabel = isOrgAdmin ? "org" : isCreator ? "creator" : contact.role;

  const getAuthHeaders = () => {
    const { token } = useAuthStore.getState();
    const { apiBaseUrl } = useSettingsStore.getState().settings;
    return { token, apiBaseUrl };
  };

  const loadInvites = async () => {
    const { token, apiBaseUrl } = getAuthHeaders();
    if (!token || !apiBaseUrl) return;
    setLoadingInvites(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${contact.id}/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites ?? []);
      }
    } catch { /* ignore */ } finally {
      setLoadingInvites(false);
    }
  };

  const handleToggleInvites = () => {
    if (!showInvites) loadInvites();
    setShowInvites(!showInvites);
    setInviteError(null);
  };

  const handleGenerateInvite = async () => {
    const { token, apiBaseUrl } = getAuthHeaders();
    if (!token || !apiBaseUrl) return;
    setGeneratingInvite(true);
    setInviteError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${contact.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error ?? "Failed to generate invite."); return; }
      await loadInvites();
    } catch (e) {
      setInviteError(`Network error: ${e}`);
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const { token, apiBaseUrl } = getAuthHeaders();
    if (!token || !apiBaseUrl) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${contact.id}/invites/${inviteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      }
    } catch { /* ignore */ }
  };

  const handleCopyInvite = async (invite: ProjectInvite) => {
    const url = `${window.location.origin}/join/project/${invite.token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopiedInviteId(invite.id);
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

  const handleStartEdit = (lp: LocalProject) => {
    setEditAgentName(lp.agentName || "");
    setEditAgentInstructions(lp.agentInstructions || "");
    setEditAgentProvider(lp.agentProvider || "claude");
    setEditCustomCommand(lp.customCommand || "");
    setEditingAgent(lp.agentName);
  };

  const handleSaveEdit = () => {
    setEditError(null);
    const lp = localAgents.find((a) => a.agentName === editingAgent);
    if (!lp) return;
    const newName = sanitizeAgentName(editAgentName.trim());
    if (!newName) {
      setEditError("Agent name is required.");
      return;
    }
    if (newName !== lp.agentName && isNameTaken(newName)) {
      setEditError(`An agent named "${newName}" already exists in this project.`);
      return;
    }
    // If agent name changed, remove the old entry first
    if (newName !== lp.agentName) {
      useProjectStore.getState().removeAgent(contact.id, lp.agentName);
    }
    const updated: LocalProject = {
      ...lp,
      agentName: newName,
      agentInstructions: editAgentInstructions.trim(),
      agentProvider: editAgentProvider,
      customCommand: editAgentProvider === "custom" ? editCustomCommand.trim() : undefined,
    };
    useProjectStore.getState().addProject(updated);
    saveProjects(useProjectStore.getState().projects);
    setEditingAgent(null);
    setEditError(null);
  };

  const handleLink = () => {
    setLinkError(null);
    if (linkAgentProvider !== "openclaw" && !linkDir.trim()) return;
    const name = sanitizeAgentName(linkAgentName.trim());
    if (!name) {
      setLinkError("Agent name is required.");
      return;
    }
    if (isNameTaken(name)) {
      setLinkError(`An agent named "${name}" already exists in this project.`);
      return;
    }
    const lp: LocalProject = {
      projectId: contact.id,
      name: contact.name,
      projectDir: linkDir.trim() || "",
      ablyChannelName: contact.ablyChannelName,
      agentName: name,
      agentInstructions: linkAgentInstructions.trim(),
      agentProvider: linkAgentProvider,
      customCommand: linkAgentProvider === "custom" ? linkCustomCommand.trim() : undefined,
    };
    useProjectStore.getState().addProject(lp);
    saveProjects(useProjectStore.getState().projects);
    setLinking(false);
    setLinkDir("");
    setLinkAgentName("");
    setLinkAgentInstructions("");
    setLinkAgentProvider("claude");
    setLinkCustomCommand("");
    setLinkError(null);
  };

  const handleUnlink = (agentName: string) => {
    useProjectStore.getState().removeAgent(contact.id, agentName);
    saveProjects(useProjectStore.getState().projects);
  };

  const handleLeaveProject = () => {
    setConfirmAction({
      title: "Leave project",
      description: "Leave this project? You will need to be re-invited to rejoin.",
      variant: "destructive",
      onConfirm: async () => {
        const { token, userId } = useAuthStore.getState();
        const { apiBaseUrl } = useSettingsStore.getState().settings;
        if (!token || !apiBaseUrl || !userId) return;
        try {
          const res = await fetch(`${apiBaseUrl}/api/projects/${contact.id}/members/${userId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            useContactStore.getState().removeContact(contact.id);
            useProjectStore.getState().removeProject(contact.id);
            saveProjects(useProjectStore.getState().projects.filter((x) => x.projectId !== contact.id));
          }
        } catch { /* ignore */ }
      },
    });
  };

  const handleDeleteProject = () => {
    setConfirmAction({
      title: "Delete project",
      description: "Delete this project? This will remove it for ALL members and cannot be undone.",
      variant: "destructive",
      onConfirm: async () => {
        const { token } = useAuthStore.getState();
        const { apiBaseUrl } = useSettingsStore.getState().settings;
        if (!token || !apiBaseUrl) return;
        try {
          const res = await fetch(`${apiBaseUrl}/api/projects/${contact.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            useContactStore.getState().removeContact(contact.id);
            useProjectStore.getState().removeProject(contact.id);
            saveProjects(useProjectStore.getState().projects.filter((x) => x.projectId !== contact.id));
          }
        } catch { /* ignore */ }
      },
    });
  };

  const handleJoinProject = async () => {
    const { token, username: uname } = useAuthStore.getState();
    const { apiBaseUrl } = useSettingsStore.getState().settings;
    if (!token || !apiBaseUrl || !uname) return;
    setJoining(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${contact.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: uname, role: "member" }),
      });
      if (res.ok) {
        // Refresh contacts to get updated role
        await useContactStore.getState().loadFromServer(apiBaseUrl, token);
      }
    } catch { /* ignore */ } finally {
      setJoining(false);
    }
  };

  const inputClass = "w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <div className="bg-muted/30 rounded-lg border border-border overflow-hidden">
      {/* Project header */}
      <div className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                contact.isOnline ? "bg-emerald-400" : "bg-muted-foreground/30"
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{contact.name}</div>
            {contact.description && (
              <div className="text-xs text-muted-foreground truncate">{contact.description}</div>
            )}
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
            isOrgAdmin
              ? "bg-amber-500/10 text-amber-600"
              : isCreator
                ? "bg-emerald-500/10 text-emerald-600"
                : contact.role === "admin"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
          }`}>
            {roleLabel}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {contact.memberCount != null && (
            <span>{contact.memberCount} member{contact.memberCount !== 1 ? "s" : ""}</span>
          )}
          <span>{msgCount} message{msgCount !== 1 ? "s" : ""}</span>
          {agents.length > 0 && (
            <span className="text-emerald-500">
              {agents.length} agent{agents.length !== 1 ? "s" : ""} online
            </span>
          )}
          {contact.createdAt && (
            <span>Created {formatDate(contact.createdAt)}</span>
          )}
        </div>

        {/* Online agents detail */}
        {agents.length > 0 && (
          <div className="space-y-1">
            {agents.map((a) => (
              <div key={a.connectionId} className="flex items-center gap-1.5 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-foreground font-medium">{a.agentName}</span>
                {a.machineName && (
                  <span className="text-muted-foreground">on {a.machineName}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite links — admin only */}
      {isAdmin && (
        <div className="border-t border-border/50 px-3 py-2">
          <button
            onClick={handleToggleInvites}
            className="text-[11px] text-primary/70 hover:text-primary transition-colors"
          >
            {showInvites ? "- Hide invite links" : "+ Invite members"}
          </button>

          {showInvites && (
            <div className="mt-2 space-y-2">
              {/* Generate new invite */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] text-muted-foreground mb-0.5">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                    className={inputClass + " text-xs py-1"}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                  className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-[11px] font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {generatingInvite ? "..." : "Generate Link"}
                </button>
              </div>

              {inviteError && (
                <p className="text-[10px] text-destructive">{inviteError}</p>
              )}

              {/* Active invites list */}
              {loadingInvites ? (
                <p className="text-[10px] text-muted-foreground animate-pulse">Loading...</p>
              ) : invites.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium">Active invite links</p>
                  {invites.map((inv) => {
                    const expired = inv.expiresAt ? new Date(inv.expiresAt) < new Date() : false;
                    const exhausted = inv.maxUses ? inv.useCount >= inv.maxUses : false;
                    const isInvalid = expired || exhausted;
                    return (
                      <div
                        key={inv.id}
                        className={`flex items-center gap-1.5 text-[10px] ${isInvalid ? "opacity-50" : ""}`}
                      >
                        <span className="text-muted-foreground capitalize flex-shrink-0">{inv.role}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">
                          {inv.useCount} use{inv.useCount !== 1 ? "s" : ""}
                          {inv.maxUses != null && ` / ${inv.maxUses}`}
                        </span>
                        {isInvalid && (
                          <span className="text-destructive/70 flex-shrink-0">
                            {expired ? "(expired)" : "(limit reached)"}
                          </span>
                        )}
                        <div className="flex-1" />
                        <button
                          onClick={() => handleCopyInvite(inv)}
                          className="text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                        >
                          {copiedInviteId === inv.id ? "Copied!" : "Copy"}
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="text-destructive hover:text-destructive/80 transition-colors flex-shrink-0"
                        >
                          Revoke
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground italic">No active invite links.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Local agents — desktop only, not for org-admin view-only */}
      {!isOrgAdmin && isTauri && localAgents.map((lp) => (
        editingAgent === lp.agentName ? (
          /* Edit form for this agent */
          <div key={lp.agentName} className="border-t border-border/50 bg-muted/10 px-3 py-2 space-y-2">
            <input
              type="text"
              value={editAgentName}
              onChange={(e) => { setEditAgentName(e.target.value); setEditError(null); }}
              placeholder="Agent name (required, no spaces)"
              className={inputClass + " text-xs"}
            />
            <ProviderSelect value={editAgentProvider} onChange={setEditAgentProvider} inputClass={inputClass} />
            {editAgentProvider === "custom" && (
              <div>
                <label className="block text-[10px] text-muted-foreground mb-0.5">
                  Command template <span className="opacity-60">(use {"{prompt}"} as placeholder)</span>
                </label>
                <input
                  type="text"
                  value={editCustomCommand}
                  onChange={(e) => setEditCustomCommand(e.target.value)}
                  placeholder='e.g. my-agent --prompt {prompt}'
                  className={inputClass + " text-xs font-mono"}
                />
              </div>
            )}
            <textarea
              value={editAgentInstructions}
              onChange={(e) => setEditAgentInstructions(e.target.value)}
              placeholder="Agent instructions (supports markdown)..."
              rows={6}
              className={inputClass + " text-xs resize-y min-h-[60px] max-h-[300px]"}
            />
            {editError && (
              <p className="text-[10px] text-destructive">{editError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setEditingAgent(null); setEditError(null); }}
                className="px-2.5 py-1 rounded text-[11px] font-medium text-muted-foreground bg-muted/40 hover:bg-muted/60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editAgentName.trim()}
                className="px-2.5 py-1 rounded text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          /* Display row for this agent */
          <div key={lp.agentName} className="border-t border-border/50 bg-muted/10 px-3 py-2 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-primary/80 font-medium">
                Agent: {lp.agentName || defaultAgentName}
              </span>
              {lp.agentProvider && lp.agentProvider !== "claude" && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-medium">
                  {PROVIDER_LABELS[lp.agentProvider] || lp.agentProvider}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground font-mono truncate flex-1">
                {lp.agentProvider === "openclaw" ? "local gateway" : lp.projectDir}
              </span>
              <button
                onClick={() => handleStartEdit(lp)}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                Edit
              </button>
              <button
                onClick={() => handleUnlink(lp.agentName)}
                className="text-[11px] text-destructive hover:text-destructive/80 transition-colors flex-shrink-0"
              >
                Unlink
              </button>
            </div>
            {lp.agentInstructions && (
              <div className="text-[11px] text-muted-foreground line-clamp-2">
                {lp.agentInstructions}
              </div>
            )}
          </div>
        )
      ))}

      {/* Add agent button — desktop only, not org-admin */}
      {!isOrgAdmin && isTauri && !linking && (
        <div className="border-t border-border/50 px-3 py-2">
          <button
            onClick={() => setLinking(true)}
            className="text-[11px] text-primary/70 hover:text-primary transition-colors"
          >
            + {localAgents.length > 0 ? "Add another agent" : "Register agent on this machine"}
          </button>
        </div>
      )}

      {!isOrgAdmin && isTauri && linking && (
        <div className="border-t border-border/50 bg-muted/10 px-3 py-2 space-y-2">
          <p className="text-[11px] font-medium text-foreground">
            {localAgents.length > 0 ? "Add another agent" : "Register agent"}
          </p>
          <input
            type="text"
            value={linkAgentName}
            onChange={(e) => { setLinkAgentName(e.target.value); setLinkError(null); }}
            placeholder="Agent name (required, no spaces)"
            className={inputClass + " text-xs"}
          />
          <ProviderSelect value={linkAgentProvider} onChange={setLinkAgentProvider} inputClass={inputClass} />
          {linkAgentProvider === "openclaw" && (
            <p className="text-[10px] text-muted-foreground">
              Auto-connects to your local OpenClaw gateway. Make sure it&apos;s running
              (<span className="font-mono">openclaw gateway start</span>).
            </p>
          )}
          {linkAgentProvider !== "openclaw" && (
            <input
              type="text"
              value={linkDir}
              onChange={(e) => setLinkDir(e.target.value)}
              placeholder="Local path, e.g. C:\Users\you\Code\my-project"
              className={inputClass + " text-xs font-mono"}
            />
          )}
          {linkAgentProvider === "custom" && (
            <div>
              <label className="block text-[10px] text-muted-foreground mb-0.5">
                Command template <span className="opacity-60">(use {"{prompt}"} as placeholder)</span>
              </label>
              <input
                type="text"
                value={linkCustomCommand}
                onChange={(e) => setLinkCustomCommand(e.target.value)}
                placeholder='e.g. my-agent --prompt {prompt}'
                className={inputClass + " text-xs font-mono"}
              />
            </div>
          )}
          <textarea
            value={linkAgentInstructions}
            onChange={(e) => setLinkAgentInstructions(e.target.value)}
            placeholder="Agent instructions (supports markdown)..."
            rows={6}
            className={inputClass + " text-xs resize-y min-h-[60px] max-h-[300px]"}
          />
          {linkError && (
            <p className="text-[10px] text-destructive">{linkError}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setLinking(false); setLinkDir(""); setLinkError(null); }}
              className="px-2.5 py-1 rounded text-[11px] font-medium text-muted-foreground bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={!linkAgentName.trim() || (linkAgentProvider !== "openclaw" && !linkDir.trim())}
              className="px-2.5 py-1 rounded text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Link
            </button>
          </div>
        </div>
      )}

      {/* Join / Leave / Delete project */}
      <div className="border-t border-border/50 px-3 py-2 flex gap-3">
        {isOrgAdmin ? (
          <button
            onClick={handleJoinProject}
            disabled={joining}
            className="text-[11px] text-primary hover:text-primary/80 transition-colors font-medium disabled:opacity-50"
          >
            {joining ? "Joining..." : "Join project"}
          </button>
        ) : (
          <>
            <button
              onClick={handleLeaveProject}
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
            >
              Leave project
            </button>
            {isAdmin && (
              <button
                onClick={handleDeleteProject}
                className="text-[11px] text-destructive/60 hover:text-destructive transition-colors"
              >
                Delete project
              </button>
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        open={!!confirmAction}
        onConfirm={() => {
          confirmAction?.onConfirm();
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
        title={confirmAction?.title ?? ""}
        description={confirmAction?.description ?? ""}
        confirmLabel={confirmAction?.title.startsWith("Delete") ? "Delete" : "Continue"}
        variant={confirmAction?.variant}
      />
    </div>
  );
}

export function ProjectsPanel() {
  const contacts = useContactStore((s) => s.contacts);
  const orgs = useOrgStore((s) => s.orgs);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Create new project on server" form
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string>(activeOrgId ?? "");
  const [newProjectDir, setNewProjectDir] = useState("");
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentInstructions, setNewAgentInstructions] = useState("");
  const [newAgentProvider, setNewAgentProvider] = useState("claude");
  const [newCustomCommand, setNewCustomCommand] = useState("");
  const [busy, setBusy] = useState(false);

  const defaultAgentName = useSettingsStore.getState().settings.machineName || "Agent";
  const allContacts = Object.values(contacts);

  const handleCreateNew = async () => {
    if (!newProjectName.trim()) {
      setError("Project name is required.");
      return;
    }
    if (isTauri && !sanitizeAgentName(newAgentName.trim())) {
      setError("Agent name is required.");
      return;
    }
    if (isTauri && newAgentProvider !== "openclaw" && !newProjectDir.trim()) {
      setError("Local directory is required.");
      return;
    }
    const { token } = useAuthStore.getState();
    const { apiBaseUrl } = useSettingsStore.getState().settings;
    if (!token || !apiBaseUrl) { setError("Not authenticated."); return; }

    setBusy(true);
    setError(null);
    try {
      const orgId = selectedOrgId || undefined;
      const res = await fetch(`${apiBaseUrl}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newProjectName.trim(), description: newProjectDescription.trim() || undefined, orgId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create project."); return; }

      const p = data.project;
      useContactStore.getState().upsertContact({
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        ownerId: p.ownerId ?? null,
        orgId: p.orgId ?? selectedOrgId ?? null,
        ablyChannelName: p.ablyChannelName,
        isOnline: false,
        lastSeen: null,
        role: "admin",
        onlineAgents: [],
        createdAt: p.createdAt ?? null,
        memberCount: 1,
      });

      if (isTauri && (newProjectDir.trim() || newAgentProvider === "openclaw")) {
        const newLocal: LocalProject = {
          projectId: p.id,
          name: p.name,
          projectDir: newProjectDir.trim() || "",
          ablyChannelName: p.ablyChannelName,
          agentName: sanitizeAgentName(newAgentName.trim()),
          agentInstructions: newAgentInstructions.trim(),
          agentProvider: newAgentProvider,
          customCommand: newAgentProvider === "custom" ? newCustomCommand.trim() : undefined,
        };
        useProjectStore.getState().addProject(newLocal);
        saveProjects(useProjectStore.getState().projects);
      }

      // Notify other org members to refresh their project list
      if (orgId) {
        const ably = getAbly();
        if (ably) {
          ably.channels.get("jaibber:presence").publish("refresh-projects", { orgId });
        }
      }

      setNewProjectName("");
      setNewProjectDescription("");
      setSelectedOrgId(activeOrgId ?? "");
      setNewProjectDir("");
      setNewAgentName("");
      setNewAgentInstructions("");
      setNewAgentProvider("claude");
      setNewCustomCommand("");
      setCreating(false);
    } catch (e) {
      setError(`Network error: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Projects</h2>
      <p className="text-xs text-muted-foreground">
        {isTauri
          ? "All projects you belong to. Projects registered on this machine will run an AI agent."
          : "All projects you belong to. To run an agent, register the project on the desktop app."}
      </p>

      {/* All projects list */}
      {allContacts.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No projects yet. Create one below.</p>
      ) : (
        <div className="space-y-2">
          {allContacts.map((c) => (
            <ProjectCard key={c.id} contact={c} />
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Create new project form */}
      {creating ? (
        <div className="space-y-2 border border-border rounded-lg p-3">
          <p className="text-xs font-medium text-foreground">Create new project</p>
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name, e.g. My Frontend App"
            className={inputClass}
          />
          {orgs.length > 0 && (
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className={inputClass}
            >
              <option value="">Personal (no organization)</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
            placeholder="Description (optional)"
            className={inputClass}
          />
          {isTauri && (
            <>
              <input
                type="text"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="Agent name (required, no spaces)"
                className={inputClass}
              />
              <ProviderSelect value={newAgentProvider} onChange={setNewAgentProvider} inputClass={inputClass} />
              {newAgentProvider === "openclaw" && (
                <p className="text-[10px] text-muted-foreground">
                  Auto-connects to your local OpenClaw gateway. Make sure it&apos;s running
                  (<span className="font-mono">openclaw gateway start</span>).
                </p>
              )}
              {newAgentProvider !== "openclaw" && (
                <input
                  type="text"
                  value={newProjectDir}
                  onChange={(e) => setNewProjectDir(e.target.value)}
                  placeholder="Local path, e.g. C:\Users\you\Code\my-project"
                  className={inputClass + " font-mono"}
                />
              )}
              {newAgentProvider === "custom" && (
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-0.5">
                    Command template <span className="opacity-60">(use {"{prompt}"} as placeholder)</span>
                  </label>
                  <input
                    type="text"
                    value={newCustomCommand}
                    onChange={(e) => setNewCustomCommand(e.target.value)}
                    placeholder='e.g. my-agent --prompt {prompt}'
                    className={inputClass + " font-mono"}
                  />
                </div>
              )}
              <textarea
                value={newAgentInstructions}
                onChange={(e) => setNewAgentInstructions(e.target.value)}
                placeholder="Agent instructions (supports markdown). e.g. You write code but never run tests..."
                rows={8}
                className={inputClass + " resize-y min-h-[80px] max-h-[400px]"}
              />
            </>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setCreating(false); setError(null); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateNew}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {busy ? "Creating..." : isTauri ? "Create & Link" : "Create"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setCreating(true); setError(null); }}
          className="w-full border border-dashed border-border rounded-lg py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          + Create new project
        </button>
      )}
    </div>
  );
}
