import { useState } from "react";
import { storage, isTauri } from "@/lib/platform";
import { useProjectStore } from "@/stores/projectStore";
import { useContactStore } from "@/stores/contactStore";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { LocalProject } from "@/stores/projectStore";
import type { Contact } from "@/types/contact";

async function saveProjects(projects: LocalProject[]) {
  await storage.set("local_projects", projects);
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
  const localProjects = useProjectStore((s) => s.projects);
  const messages = useChatStore((s) => s.messages[contact.id]);
  const localProject = localProjects.find((p) => p.projectId === contact.id);
  const msgCount = messages?.length ?? 0;
  const agents = contact.onlineAgents ?? [];

  // Edit state for local agent config
  const [editing, setEditing] = useState(false);
  const [editAgentName, setEditAgentName] = useState("");
  const [editAgentInstructions, setEditAgentInstructions] = useState("");

  // Link state for registering on this machine
  const [linking, setLinking] = useState(false);
  const [linkDir, setLinkDir] = useState("");
  const [linkAgentName, setLinkAgentName] = useState("");
  const [linkAgentInstructions, setLinkAgentInstructions] = useState("");

  // Invite link state
  const [showInvites, setShowInvites] = useState(false);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const defaultAgentName = useSettingsStore.getState().settings.machineName || "Agent";
  const isAdmin = contact.role === "admin";

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

  const handleStartEdit = () => {
    setEditAgentName(localProject?.agentName || "");
    setEditAgentInstructions(localProject?.agentInstructions || "");
    setEditing(true);
  };

  const handleSaveEdit = () => {
    if (!localProject) return;
    const updated: LocalProject = {
      ...localProject,
      agentName: editAgentName.trim() || defaultAgentName,
      agentInstructions: editAgentInstructions.trim(),
    };
    useProjectStore.getState().addProject(updated);
    saveProjects(useProjectStore.getState().projects);
    setEditing(false);
  };

  const handleLink = () => {
    if (!linkDir.trim()) return;
    const lp: LocalProject = {
      projectId: contact.id,
      name: contact.name,
      projectDir: linkDir.trim(),
      ablyChannelName: contact.ablyChannelName,
      agentName: linkAgentName.trim() || defaultAgentName,
      agentInstructions: linkAgentInstructions.trim(),
    };
    useProjectStore.getState().addProject(lp);
    saveProjects(useProjectStore.getState().projects);
    setLinking(false);
    setLinkDir("");
    setLinkAgentName("");
    setLinkAgentInstructions("");
  };

  const handleUnlink = () => {
    useProjectStore.getState().removeProject(contact.id);
    saveProjects(useProjectStore.getState().projects.filter((x) => x.projectId !== contact.id));
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
            contact.role === "admin"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}>
            {contact.role}
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

      {/* Local agent config — desktop only */}
      {isTauri && localProject && !editing && (
        <div className="border-t border-border/50 bg-muted/10 px-3 py-2 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-primary/80 font-medium">
              Agent: {localProject.agentName || defaultAgentName}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono truncate flex-1">
              {localProject.projectDir}
            </span>
            <button
              onClick={handleStartEdit}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              Edit
            </button>
            <button
              onClick={handleUnlink}
              className="text-[11px] text-destructive hover:text-destructive/80 transition-colors flex-shrink-0"
            >
              Unlink
            </button>
          </div>
          {localProject.agentInstructions && (
            <div className="text-[11px] text-muted-foreground line-clamp-2">
              {localProject.agentInstructions}
            </div>
          )}
        </div>
      )}

      {/* Edit form */}
      {isTauri && localProject && editing && (
        <div className="border-t border-border/50 bg-muted/10 px-3 py-2 space-y-2">
          <input
            type="text"
            value={editAgentName}
            onChange={(e) => setEditAgentName(e.target.value)}
            placeholder={`Agent name (default: ${defaultAgentName})`}
            className={inputClass + " text-xs"}
          />
          <textarea
            value={editAgentInstructions}
            onChange={(e) => setEditAgentInstructions(e.target.value)}
            placeholder="Agent instructions (supports markdown)..."
            rows={6}
            className={inputClass + " text-xs resize-y min-h-[60px] max-h-[300px]"}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-2.5 py-1 rounded text-[11px] font-medium text-muted-foreground bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-2.5 py-1 rounded text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Link to this machine — desktop only, not yet registered */}
      {isTauri && !localProject && !linking && (
        <div className="border-t border-border/50 px-3 py-2">
          <button
            onClick={() => setLinking(true)}
            className="text-[11px] text-primary/70 hover:text-primary transition-colors"
          >
            + Register agent on this machine
          </button>
        </div>
      )}

      {isTauri && !localProject && linking && (
        <div className="border-t border-border/50 bg-muted/10 px-3 py-2 space-y-2">
          <p className="text-[11px] font-medium text-foreground">Register agent</p>
          <input
            type="text"
            value={linkDir}
            onChange={(e) => setLinkDir(e.target.value)}
            placeholder="Local path, e.g. C:\Users\you\Code\my-project"
            className={inputClass + " text-xs font-mono"}
          />
          <input
            type="text"
            value={linkAgentName}
            onChange={(e) => setLinkAgentName(e.target.value)}
            placeholder={`Agent name (default: ${defaultAgentName})`}
            className={inputClass + " text-xs"}
          />
          <textarea
            value={linkAgentInstructions}
            onChange={(e) => setLinkAgentInstructions(e.target.value)}
            placeholder="Agent instructions (supports markdown)..."
            rows={6}
            className={inputClass + " text-xs resize-y min-h-[60px] max-h-[300px]"}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setLinking(false); setLinkDir(""); }}
              className="px-2.5 py-1 rounded text-[11px] font-medium text-muted-foreground bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={!linkDir.trim()}
              className="px-2.5 py-1 rounded text-[11px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectsPanel() {
  const contacts = useContactStore((s) => s.contacts);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Create new project on server" form
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectDir, setNewProjectDir] = useState("");
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentInstructions, setNewAgentInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  const defaultAgentName = useSettingsStore.getState().settings.machineName || "Agent";
  const allContacts = Object.values(contacts);

  const handleCreateNew = async () => {
    if (!newProjectName.trim()) {
      setError("Project name is required.");
      return;
    }
    if (isTauri && !newProjectDir.trim()) {
      setError("Local directory is required.");
      return;
    }
    const { token } = useAuthStore.getState();
    const { apiBaseUrl } = useSettingsStore.getState().settings;
    if (!token || !apiBaseUrl) { setError("Not authenticated."); return; }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newProjectName.trim(), description: newProjectDescription.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create project."); return; }

      const p = data.project;
      useContactStore.getState().upsertContact({
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        ablyChannelName: p.ablyChannelName,
        isOnline: false,
        lastSeen: null,
        role: "admin",
        onlineAgents: [],
        createdAt: p.createdAt ?? null,
        memberCount: 1,
      });

      if (isTauri && newProjectDir.trim()) {
        const newLocal: LocalProject = {
          projectId: p.id,
          name: p.name,
          projectDir: newProjectDir.trim(),
          ablyChannelName: p.ablyChannelName,
          agentName: newAgentName.trim() || defaultAgentName,
          agentInstructions: newAgentInstructions.trim(),
        };
        useProjectStore.getState().addProject(newLocal);
        saveProjects(useProjectStore.getState().projects);
      }

      setNewProjectName("");
      setNewProjectDescription("");
      setNewProjectDir("");
      setNewAgentName("");
      setNewAgentInstructions("");
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
          ? "All projects you belong to. Projects registered on this machine will run Claude as an agent."
          : "All projects you belong to. To run a Claude agent, register the project on the desktop app."}
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
                value={newProjectDir}
                onChange={(e) => setNewProjectDir(e.target.value)}
                placeholder="Local path, e.g. C:\Users\you\Code\my-project"
                className={inputClass + " font-mono"}
              />
              <input
                type="text"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder={`Agent name (default: ${defaultAgentName})`}
                className={inputClass}
              />
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
