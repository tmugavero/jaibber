import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useContactStore } from "@/stores/contactStore";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { LocalProject } from "@/stores/projectStore";

export function ProjectsPanel() {
  const projects = useProjectStore((s) => s.projects);
  const contacts = useContactStore((s) => s.contacts);
  const { addProject, removeProject } = useProjectStore.getState();

  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Add existing project" form
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectDir, setProjectDir] = useState("");

  // "Create new project on server" form
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectDir, setNewProjectDir] = useState("");
  const [busy, setBusy] = useState(false);

  // Projects on the server not yet registered locally
  const unregisteredContacts = Object.values(contacts).filter(
    (c) => !projects.some((p) => p.projectId === c.id)
  );

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
    };
    addProject(lp);
    setSelectedProjectId("");
    setProjectDir("");
    setAdding(false);
    setError(null);
  };

  const handleCreateNew = async () => {
    if (!newProjectName.trim() || !newProjectDir.trim()) {
      setError("Project name and local directory are required.");
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

      // Register locally with the project dir
      addProject({
        projectId: p.id,
        name: p.name,
        projectDir: newProjectDir.trim(),
        ablyChannelName: p.ablyChannelName,
      });

      setNewProjectName("");
      setNewProjectDescription("");
      setNewProjectDir("");
      setCreating(false);
    } catch (e) {
      setError(`Network error: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">My Projects</h2>
      <p className="text-xs text-muted-foreground">
        Projects registered here will run Claude on incoming messages using the specified local directory.
      </p>

      {/* Registered projects list */}
      {projects.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No projects registered on this machine.</p>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <div
              key={p.projectId}
              className="flex items-start gap-2 bg-muted/30 rounded-lg p-3 border border-border"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground font-mono truncate">{p.projectDir}</div>
              </div>
              <button
                onClick={() => removeProject(p.projectId)}
                className="text-xs text-destructive hover:text-destructive/80 transition-colors flex-shrink-0 mt-0.5"
                title="Remove from this machine"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Add existing project */}
      {adding ? (
        <div className="space-y-2 border border-border rounded-lg p-3">
          <p className="text-xs font-medium text-foreground">Link project to this machine</p>
          {unregisteredContacts.length === 0 ? (
            <p className="text-xs text-muted-foreground">All your server projects are already registered here.</p>
          ) : (
            <>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="">Select a project…</option>
                {unregisteredContacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={projectDir}
                onChange={(e) => setProjectDir(e.target.value)}
                placeholder="Local path, e.g. C:\Users\you\Code\my-project"
                className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
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
          <p className="text-xs font-medium text-foreground">Create new project on server</p>
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name, e.g. My Frontend App"
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <input
            type="text"
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <input
            type="text"
            value={newProjectDir}
            onChange={(e) => setNewProjectDir(e.target.value)}
            placeholder="Local path, e.g. C:\Users\you\Code\my-project"
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
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
              {busy ? "Creating…" : "Create & Link"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {unregisteredContacts.length > 0 && (
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
