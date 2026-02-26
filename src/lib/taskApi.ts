import type { Task, TaskStatus, TaskPriority } from "@/types/task";

interface ServerTaskPage {
  data: Task[];
  meta: {
    cursor: string | null;
    hasMore: boolean;
  };
}

/** Fetch paginated tasks for a project. */
export async function fetchTasks(
  apiBaseUrl: string,
  token: string,
  projectId: string,
  filters?: { status?: TaskStatus; assignedAgentName?: string; limit?: number; before?: string },
): Promise<{ tasks: Task[]; hasMore: boolean; cursor: string | null }> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.assignedAgentName) params.set("assignedAgentName", filters.assignedAgentName);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.before) params.set("before", filters.before);

  const qs = params.toString();
  const url = `${apiBaseUrl}/api/projects/${projectId}/tasks${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return { tasks: [], hasMore: false, cursor: null };

  const page: ServerTaskPage = await res.json();
  return {
    tasks: page.data,
    hasMore: page.meta.hasMore,
    cursor: page.meta.cursor,
  };
}

/** Create a task in a project. */
export async function createTask(
  apiBaseUrl: string,
  token: string,
  projectId: string,
  data: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    assignedAgentName?: string;
    sourceMessageId?: string;
  },
): Promise<Task | null> {
  const res = await fetch(`${apiBaseUrl}/api/projects/${projectId}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) return null;
  const { data: task }: { data: Task } = await res.json();
  return task;
}

/** Update a task. */
export async function updateTask(
  apiBaseUrl: string,
  token: string,
  taskId: string,
  updates: Partial<Pick<Task, "title" | "description" | "status" | "priority" | "assignedAgentName">>,
): Promise<Task | null> {
  const res = await fetch(`${apiBaseUrl}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!res.ok) return null;
  const { data: task }: { data: Task } = await res.json();
  return task;
}

/** Delete a task. */
export async function deleteTask(
  apiBaseUrl: string,
  token: string,
  taskId: string,
): Promise<boolean> {
  const res = await fetch(`${apiBaseUrl}/api/tasks/${taskId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}
