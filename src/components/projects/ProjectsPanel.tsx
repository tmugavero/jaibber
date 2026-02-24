import { useState } from "react";
import { storage, isTauri } from "@/lib/platform";
import { useProjectStore } from "@/stores/projectStore";
import { useContactStore } from "@/stores/contactStore";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { LocalProject } from "@/stores/projectStore";

async function saveProjects(projects: LocalProject[]) {
  await storage.set("local_projects", projects);
}

export function ProjectsPanel() {
  const projects = useProjectStore((s) => s.projects);
  const contacts = useContactStore((s) => s.contacts);
  const { addProject, removeProject } = useProjectStore.getState();

  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // "Add existing project" form
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectDir, setProjectDir] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentInstructions, setAgentInstructions] = useState("");

  // "Create new project on server" form
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectDir, setNewProjectDir] = useState("");
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentInstructions, setNewAgentInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  // Edit form
  const [editAgentName, setEditAgentName] = useState("");
  const [editAgentInstructions, setEditAgentInstructions] = useState("");

  // Projects on the server not yet registered locally
  const unregisteredContacts = Object.values(contacts).filter(
    (c) => !projects.some((p) => p.projectId === c.id)
  );

  const defaultAgentName = useSettingsStore.getState().settings.machineName || "Agent";

  const handleAddExisting = () => {
    if (!selectedProjectId || !projectDir.trim()) {
      setError("Select a project and enter the local directory path.");
      return;
    }
    const contact = contacts[selectedProjectId];
    if (!contact) return;
    const lp: LocalProject = {
      projectId: contact.id,
      name: contact.name,
      projectDir: projectDir.trim(),
      ablyChannelName: contact.ablyChannelName,
      agentName: agentName.trim() || defaultAgentName,
      agentInstructions: agentInstructions.trim(),
    };
    addProject(lp);
    saveProjects(useProjectStore.getState().projects);
    setSelectedProjectId("");
    setProjectDir("");
    setAgentName("");
    setAgentInstructions("");
    setAdding(false);
    setError(null);
  };

  const handleCreateNew = async () => {
    if (!newProjectName.trim()) {
      setError("Project name is required.");
      return;
    }
    // On desktop, local directory is required for agent registration
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
      // Add to contactStore so it appears in the sidebar
      useContactStore.getState().upsertContact({
        id: p.id,
        name: p.name,
        description: p.description ?? null,
        ablyChannelName: p.ablyChannelName,
        isOnline: false,
        lastSeen: null,
        role: "admin",
      });

      // On desktop, also register locally with the project dir
      if (isTauri && newProjectDir.trim()) {
        const newLocal: LocalProject = {
          projectId: p.id,
          name: p.name,
          projectDir: newProjectDir.trim(),
          ablyChannelName: p.ablyChannelName,
          agentName: newAgentName.trim() || defaultAgentName,
          agentInstructions: newAgentInstructions.trim(),
        };
        addProject(newLocal);
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

  const handleStartEdit = (p: LocalProject) => {
    setEditingId(p.projectId);
    setEditAgentName(p.agentName || "");
    setEditAgentInstructions(p.agentInstructions || "");
  };

  const handleSaveEdit = (p: LocalProject) => {
    const updated: LocalProject = {
      ...p,
      agentName: editAgentName.trim() || defaultAgentName,
      agentInstructions: editAgentInstructions.trim(),
    };
    addProject(updated);
    saveProjects(useProjectStore.getState().projects);
    setEditingId(null);
  };

  const inputClass = "w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">
        {isTauri ? "My Projects" : "Projects"}
      </h2>
      <p className="text-xs text-muted-foreground">
        {isTauri
          ? "Projects registered here will run Claude on incoming messages using the specified local directory."
          : "Create projects for your team. To run a Claude agent, register the project on the desktop app."}
      </p>

      {/* Registered projects list — desktop only */}
      {isTauri && (
        <>
          {projects.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No projects registered on this machine.</p>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <div
                  key={p.projectId}
                  className="bg-muted/30 rounded-lg p-3 border border-border space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{p.projectDir}</div>
                      <div className="text-xs text-primary/80 mt-0.5">Agent: {p.agentName || defaultAgentName}</div>
                      {p.agentInstructions && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.agentInstructions}</div>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                      <button
                        onClick={() => handleStartEdit(p)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit agent settings"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { removeProject(p.projectId); saveProjects(useProjectStore.getState().projects.filter(x => x.projectId !== p.projectId)); }}
                        className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                        title="Remove from this machine"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {editingId === p.projectId && (
                    <div className="space-y-2 border-t border-border pt-2">
                      <input
                        type="text"
                        value={editAgentName}
                        onChange={(e) => setEditAgentName(e.target.value)}
                        placeholder={`Agent name (default: ${defaultAgentName})`}
                        className={inputClass}
                      />
                      <textarea
                        value={editAgentInstructions}
                        onChange={(e) => setEditAgentInstructions(e.target.value)}
                        placeholder="Agent instructions, e.g. You write code but never run tests..."
                        rows={3}
                        className={inputClass + " resize-none"}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground bg-muted/40 hover:bg-muted/60 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(p)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Add existing project — desktop only */}
      {adding && isTauri ? (
        <div className="space-y-2 border border-border rounded-lg p-3">
          <p className="text-xs font-medium text-foreground">Link project to this machine</p>
          {unregisteredContacts.length === 0 ? (
            <p className="text-xs text-muted-foreground">All your server projects are already registered here.</p>
          ) : (
            <>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a project...</option>
                {unregisteredContacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={projectDir}
                onChange={(e) => setProjectDir(e.target.value)}
                placeholder="Local path, e.g. C:\Users\you\Code\my-project"
                className={inputClass + " font-mono"}
              />
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder={`Agent name (default: ${defaultAgentName})`}
                className={inputClass}
              />
              <textarea
                value={agentInstructions}
                onChange={(e) => setAgentInstructions(e.target.value)}
                placeholder="Agent instructions, e.g. You write code but never run tests..."
                rows={3}
                className={inputClass + " resize-none"}
              />
            </>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setAdding(false); setError(null); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              Cancel
            </button>
            {unregisteredContacts.length > 0 && (
              <button
                onClick={handleAddExisting}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Link
              </button>
            )}
          </div>
        </div>
      ) : creating ? (
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
                placeholder="Agent instructions, e.g. You write code but never run tests..."
                rows={3}
                className={inputClass + " resize-none"}
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
        <div className="flex gap-2">
          {isTauri && unregisteredContacts.length > 0 && (
            <button
              onClick={() => { setAdding(true); setError(null); }}
              className="flex-1 border border-dashed border-border rounded-lg py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              + Link existing project
            </button>
          )}
          <button
            onClick={() => { setCreating(true); setError(null); }}
            className="flex-1 border border-dashed border-border rounded-lg py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            + Create new project
          </button>
        </div>
      )}
    </div>
  );
}
