import { create } from "zustand";
import type { Task } from "@/types/task";

interface TaskStore {
  tasks: Record<string, Task[]>;  // key = projectId
  loadTasks: (projectId: string, tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: {},

  loadTasks: (projectId, tasks) =>
    set((s) => ({ tasks: { ...s.tasks, [projectId]: tasks } })),

  addTask: (task) =>
    set((s) => {
      const existing = s.tasks[task.projectId] ?? [];
      if (existing.some((t) => t.id === task.id)) return s;
      return { tasks: { ...s.tasks, [task.projectId]: [task, ...existing] } };
    }),

  updateTask: (taskId, updates) =>
    set((s) => {
      const newTasks = { ...s.tasks };
      for (const [pid, list] of Object.entries(newTasks)) {
        const idx = list.findIndex((t) => t.id === taskId);
        if (idx >= 0) {
          newTasks[pid] = list.map((t) =>
            t.id === taskId ? { ...t, ...updates } : t
          );
          break;
        }
      }
      return { tasks: newTasks };
    }),

  removeTask: (taskId) =>
    set((s) => {
      const newTasks = { ...s.tasks };
      for (const [pid, list] of Object.entries(newTasks)) {
        const filtered = list.filter((t) => t.id !== taskId);
        if (filtered.length !== list.length) {
          newTasks[pid] = filtered;
          break;
        }
      }
      return { tasks: newTasks };
    }),
}));
