import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTaskStore } from "@/stores/taskStore";
import { useContactStore } from "@/stores/contactStore";
import { updateTask, deleteTask } from "@/lib/taskApi";
import type { Task, TaskStatus, TaskPriority } from "@/types/task";

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "working", label: "Working" },
  { value: "input-required", label: "Input Required" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

interface Props {
  task: Task;
  onClose: () => void;
  onDeleted: () => void;
}

export function TaskDetailPanel({ task, onClose, onDeleted }: Props) {
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assignedAgent, setAssignedAgent] = useState(task.assignedAgentName ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const contact = useContactStore((s) => s.contacts[task.projectId]);
  const agents = contact?.onlineAgents ?? [];

  const handleUpdate = async (updates: Partial<Pick<Task, "status" | "priority" | "assignedAgentName">>) => {
    const { token } = useAuthStore.getState();
    const { apiBaseUrl } = useSettingsStore.getState().settings;
    if (!token || !apiBaseUrl) return;

    setSaving(true);
    const updated = await updateTask(apiBaseUrl, token, task.id, updates);
    setSaving(false);

    if (updated) {
      // Ably event will update the store; also update optimistically
      useTaskStore.getState().updateTask(task.id, updated);
    }
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    setStatus(newStatus);
    handleUpdate({ status: newStatus });
  };

  const handlePriorityChange = (newPriority: TaskPriority) => {
    setPriority(newPriority);
    handleUpdate({ priority: newPriority });
  };

  const handleAgentChange = (newAgent: string) => {
    setAssignedAgent(newAgent);
    handleUpdate({ assignedAgentName: newAgent || null });
  };

  const handleDelete = async () => {
    const { token } = useAuthStore.getState();
    const { apiBaseUrl } = useSettingsStore.getState().settings;
    if (!token || !apiBaseUrl) return;

    setDeleting(true);
    const success = await deleteTask(apiBaseUrl, token, task.id);
    setDeleting(false);

    if (success) {
      useTaskStore.getState().removeTask(task.id);
      onDeleted();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50">
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors text-xs"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
          </svg>
        </button>
        <span className="text-xs font-medium text-foreground flex-1">Task Detail</span>
        {saving && <span className="text-[10px] text-muted-foreground animate-pulse">Saving...</span>}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        <div>
          <div className="text-sm font-semibold text-foreground">{task.title}</div>
          {task.description && (
            <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{task.description}</div>
          )}
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Status</label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
              className="w-full bg-muted/40 border border-input rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Priority</label>
            <select
              value={priority}
              onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
              className="w-full bg-muted/40 border border-input rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {priorityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Assigned Agent</label>
            <select
              value={assignedAgent}
              onChange={(e) => handleAgentChange(e.target.value)}
              className="w-full bg-muted/40 border border-input rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.connectionId} value={a.agentName}>{a.agentName}</option>
              ))}
              {/* Show current assignment even if agent is offline */}
              {task.assignedAgentName && !agents.some((a) => a.agentName === task.assignedAgentName) && (
                <option value={task.assignedAgentName}>{task.assignedAgentName} (offline)</option>
              )}
            </select>
          </div>
        </div>

        <div className="space-y-1 text-[10px] text-muted-foreground">
          <div>Created by {task.createdByName} ({task.createdByType})</div>
          <div>Created {new Date(task.createdAt).toLocaleString()}</div>
          <div>Updated {new Date(task.updatedAt).toLocaleString()}</div>
          {task.sourceMessageId && (
            <div className="text-primary/70">Created from chat message</div>
          )}
        </div>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full px-3 py-1.5 text-xs text-destructive border border-destructive/30 rounded-md hover:bg-destructive/10 transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete Task"}
        </button>
      </div>
    </div>
  );
}
