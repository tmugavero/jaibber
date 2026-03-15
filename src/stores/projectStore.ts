import { create } from "zustand";

export interface LocalProject {
  projectId: string;        // UUID matching server project.id
  name: string;             // display name (synced from server)
  projectDir: string;       // absolute local filesystem path
  ablyChannelName: string;  // "jaibber:project:{projectId}"
  agentName: string;        // e.g. "Coder", "Tester" — defaults to machineName
  agentInstructions: string; // system prompt prepended to every agent call
  agentProvider: string;    // "claude" | "codex" | "gemini" | "custom"
  customCommand?: string;   // for "custom" provider: command template with {prompt} placeholder
  currentSessionId?: string; // Claude session ID for --resume (persisted across restarts)
}

interface ProjectStore {
  projects: LocalProject[];
  setProjects: (projects: LocalProject[]) => void;
  addProject: (p: LocalProject) => void;
  /** Remove a specific agent from a project (by projectId + agentName). */
  removeAgent: (projectId: string, agentName: string) => void;
  /** Remove ALL agents for a project (used for leave/delete project). */
  removeProject: (projectId: string) => void;
  /** Store a Claude session ID for resume across messages. */
  setSessionId: (projectId: string, agentName: string, sessionId: string) => void;
  /** Clear session ID (e.g. when conversation is cleared). */
  clearSessionId: (projectId: string, agentName: string) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),
  addProject: (p) =>
    set((s) => {
      // Replace if same projectId + agentName combo exists (update config)
      const filtered = s.projects.filter(
        (x) => !(x.projectId === p.projectId && x.agentName === p.agentName)
      );
      return { projects: [...filtered, p] };
    }),
  removeAgent: (projectId, agentName) =>
    set((s) => ({
      projects: s.projects.filter(
        (p) => !(p.projectId === projectId && p.agentName === agentName)
      ),
    })),
  removeProject: (projectId) =>
    set((s) => ({ projects: s.projects.filter((p) => p.projectId !== projectId) })),
  setSessionId: (projectId, agentName, sessionId) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.projectId === projectId && p.agentName === agentName
          ? { ...p, currentSessionId: sessionId }
          : p
      ),
    })),
  clearSessionId: (projectId, agentName) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.projectId === projectId && p.agentName === agentName
          ? { ...p, currentSessionId: undefined }
          : p
      ),
    })),
}));
