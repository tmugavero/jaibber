import { useState } from "react";
import { isTauri, storage } from "@/lib/platform";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useContactStore } from "@/stores/contactStore";
import { useProjectStore } from "@/stores/projectStore";
import { useOrgStore } from "@/stores/orgStore";
import { getAbly } from "@/lib/ably";
import type { LocalProject } from "@/stores/projectStore";

type Step = "welcome" | "create" | "join";

const PROVIDER_OPTIONS = [
  { value: "claude", label: "Claude" },
  { value: "codex", label: "Codex" },
  { value: "gemini", label: "Gemini" },
  { value: "openclaw", label: "OpenClaw" },
  { value: "custom", label: "Custom" },
] as const;

function sanitizeAgentName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "");
}

interface Props {
  onProjectCreated: (projectId: string) => void;
}

export function WelcomeGuide({ onProjectCreated }: Props) {
  const [step, setStep] = useState<Step>("welcome");

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 overflow-y-auto">
      <div className="w-full max-w-lg">
        {step === "welcome" && (
          <WelcomeStep
            onCreateProject={() => setStep("create")}
            onJoinProject={() => setStep("join")}
          />
        )}
        {step === "create" && (
          <CreateProjectStep
            onBack={() => setStep("welcome")}
            onCreated={onProjectCreated}
          />
        )}
        {step === "join" && (
          <JoinProjectStep
            onBack={() => setStep("welcome")}
            onJoined={onProjectCreated}
          />
        )}
      </div>
    </div>
  );
}

function WelcomeStep({ onCreateProject, onJoinProject }: {
  onCreateProject: () => void;
  onJoinProject: () => void;
}) {
  const username = useAuthStore((s) => s.username);

  return (
    <div className="text-center space-y-8">
      <div className="space-y-3">
        <div className="text-5xl">&#x26A1;</div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Welcome{username ? `, ${username}` : ""}!
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Jaibber connects you with AI agents in real-time group chats.
          {isTauri
            ? " Create a project to get started, or join one you've been invited to."
            : " Create a project or join one via an invite link from your team."}
        </p>
      </div>

      <div className="grid gap-3 max-w-sm mx-auto">
        <button
          onClick={onCreateProject}
          className="w-full bg-primary text-primary-foreground rounded-xl py-3 px-4 text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Create a project
        </button>
        <button
          onClick={onJoinProject}
          className="w-full border border-border rounded-xl py-3 px-4 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
          </svg>
          Join with invite link
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground/60">
        Projects are shared workspaces where humans and AI agents collaborate.
      </p>
    </div>
  );
}

function CreateProjectStep({ onBack, onCreated }: {
  onBack: () => void;
  onCreated: (projectId: string) => void;
}) {
  const orgs = useOrgStore((s) => s.orgs);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState(activeOrgId ?? "");

  // Desktop agent config
  const [agentName, setAgentName] = useState("");
  const [agentProvider, setAgentProvider] = useState("claude");
  const [projectDir, setProjectDir] = useState("");
  const [agentInstructions, setAgentInstructions] = useState("");
  const [customCommand, setCustomCommand] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    const cleanAgentName = sanitizeAgentName(agentName.trim());
    if (isTauri && !cleanAgentName) {
      setError("Agent name is required (alphanumeric, no spaces).");
      return;
    }
    if (isTauri && agentProvider !== "openclaw" && !projectDir.trim()) {
      setError("Local project directory is required.");
      return;
    }

    const { token } = useAuthStore.getState();
    const { apiBaseUrl } = useSettingsStore.getState().settings;
    if (!token || !apiBaseUrl) {
      setError("Not authenticated.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const orgId = selectedOrgId || undefined;
      const res = await fetch(`${apiBaseUrl}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          orgId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create project.");
        return;
      }

      const p = data.project;

      // Add to contact store
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

      // Register local agent (desktop only)
      if (isTauri && (projectDir.trim() || agentProvider === "openclaw")) {
        const lp: LocalProject = {
          projectId: p.id,
          name: p.name,
          projectDir: projectDir.trim() || "",
          ablyChannelName: p.ablyChannelName,
          agentName: cleanAgentName,
          agentInstructions: agentInstructions.trim(),
          agentProvider,
          customCommand: agentProvider === "custom" ? customCommand.trim() : undefined,
        };
        useProjectStore.getState().addProject(lp);
        await storage.set("local_projects", useProjectStore.getState().projects);
      }

      // Notify org members
      if (orgId) {
        const ably = getAbly();
        if (ably) {
          ably.channels.get("jaibber:presence").publish("refresh-projects", { orgId });
        }
      }

      onCreated(p.id);
    } catch (e) {
      setError(`Network error: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-foreground">Create a project</h2>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        A project is a shared workspace. Team members and AI agents join projects to collaborate in real time.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Project name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My App"
            autoFocus
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Description <span className="font-normal opacity-60">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
            className={inputClass}
          />
        </div>

        {orgs.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Organization</label>
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
          </div>
        )}

        {/* Desktop agent configuration */}
        {isTauri && (
          <>
            <div className="border-t border-border pt-3 mt-4">
              <p className="text-xs font-medium text-foreground mb-2">Agent configuration</p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Register an AI agent on this machine to respond to messages in the project.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Agent name</label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. Coder (no spaces)"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Agent backend</label>
              <select
                value={agentProvider}
                onChange={(e) => setAgentProvider(e.target.value)}
                className={inputClass}
              >
                {PROVIDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {agentProvider === "openclaw" && (
              <p className="text-[11px] text-muted-foreground">
                Auto-connects to your local OpenClaw gateway. Make sure it&apos;s running.
              </p>
            )}

            {agentProvider !== "openclaw" && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Local project directory</label>
                <input
                  type="text"
                  value={projectDir}
                  onChange={(e) => setProjectDir(e.target.value)}
                  placeholder="e.g. C:\Users\you\Code\my-project"
                  className={inputClass + " font-mono text-xs"}
                />
              </div>
            )}

            {agentProvider === "custom" && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Command template <span className="font-normal opacity-60">(use {"{prompt}"} as placeholder)</span>
                </label>
                <input
                  type="text"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  placeholder='e.g. my-agent --prompt {prompt}'
                  className={inputClass + " font-mono text-xs"}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Agent instructions <span className="font-normal opacity-60">(optional)</span>
              </label>
              <textarea
                value={agentInstructions}
                onChange={(e) => setAgentInstructions(e.target.value)}
                placeholder="System prompt prepended to every agent call..."
                rows={4}
                className={inputClass + " resize-y min-h-[60px] max-h-[200px]"}
              />
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={handleCreate}
        disabled={busy}
        className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-wait"
      >
        {busy ? "Creating..." : isTauri ? "Create project & register agent" : "Create project"}
      </button>
    </div>
  );
}

function JoinProjectStep({ onBack, onJoined }: {
  onBack: () => void;
  onJoined: (projectId: string) => void;
}) {
  const [inviteInput, setInviteInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Extract the invite token from a full URL or a raw token */
  function extractToken(input: string): string {
    const trimmed = input.trim();
    // Try to extract from URL pattern: /join/project/{token}
    const urlMatch = trimmed.match(/\/join\/project\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) return urlMatch[1];
    // Otherwise treat the entire input as a token
    return trimmed;
  }

  const handleJoin = async () => {
    const token = extractToken(inviteInput);
    if (!token) {
      setError("Please paste an invite link or token.");
      return;
    }

    const { token: authToken } = useAuthStore.getState();
    const { apiBaseUrl } = useSettingsStore.getState().settings;
    if (!authToken || !apiBaseUrl) {
      setError("Not authenticated.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/invites/project/${token}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to accept invite. It may be expired or invalid.");
        return;
      }

      // Reload contacts from server to get the new project
      await useContactStore.getState().loadFromServer(apiBaseUrl, authToken);

      // Find the newly joined project
      const contacts = useContactStore.getState().contacts;
      const projectId = data.projectId;
      if (projectId && contacts[projectId]) {
        onJoined(projectId);
      } else {
        // Fallback: select the most recently added project
        const allContacts = Object.values(contacts);
        if (allContacts.length > 0) {
          onJoined(allContacts[allContacts.length - 1].id);
        }
      }
    } catch (e) {
      setError(`Network error: ${e}`);
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-foreground">Join a project</h2>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Paste an invite link from a team member to join their project. Invite links look like:
      </p>
      <p className="text-[11px] font-mono text-muted-foreground/70 bg-muted/30 rounded-lg px-3 py-2 break-all">
        https://jaibber.com/join/project/abc123...
      </p>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Invite link or token</label>
        <input
          type="text"
          value={inviteInput}
          onChange={(e) => { setInviteInput(e.target.value); setError(null); }}
          placeholder="Paste invite link here"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
          className={inputClass}
        />
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={handleJoin}
        disabled={busy || !inviteInput.trim()}
        className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-wait"
      >
        {busy ? "Joining..." : "Join project"}
      </button>
    </div>
  );
}
