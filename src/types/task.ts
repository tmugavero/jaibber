export type TaskStatus = "submitted" | "working" | "input-required" | "completed" | "failed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentName: string | null;
  createdBy: string;
  createdByType: "user" | "agent";
  createdByName: string;
  sourceMessageId: string | null;
  createdAt: string;
  updatedAt: string;
}
