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
}

interface ProjectStore {
  projects: LocalProject[];
  setProjects: (projects: LocalProject[]) => void;
  addProject: (p: LocalProject) => void;
  removeProject: (projectId: string) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),
  addProject: (p) =>
    set((s) => {
      // Replace if already exists (update projectDir)
      const filtered = s.projects.filter((x) => x.projectId !== p.projectId);
      return { projects: [...filtered, p] };
    }),
  removeProject: (projectId) =>
    set((s) => ({ projects: s.projects.filter((p) => p.projectId !== projectId) })),
}));
