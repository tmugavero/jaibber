import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useContactStore } from "@/stores/contactStore";
import { createTask } from "@/lib/taskApi";
import type { TaskPriority } from "@/types/task";

interface Props {
  projectId: string;
  initialTitle?: string;
  initialDescription?: string;
  sourceMessageId?: string;
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateTaskForm({ projectId, initialTitle, initialDescription, sourceMessageId, onCreated, onCancel }: Props) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assignedAgent, setAssignedAgent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const contact = useContactStore((s) => s.contacts[projectId]);
  const agents = contact?.onlineAgents ?? [];

  const handleSubmit = async () => {
    if (!title.trim() || submitting) return;
    const { token } = useAuthStore.getState();
    const { apiBaseUrl } = useSettingsStore.getState().settings;
    if (!token || !apiBaseUrl) return;

    setSubmitting(true);
    const task = await createTask(apiBaseUrl, token, projectId, {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assignedAgentName: assignedAgent || undefined,
      sourceMessageId: sourceMessageId || undefined,
    });
    setSubmitting(false);

    if (task) {
      onCreated();
    }
  };

  return (
    <div className="p-3 space-y-3 border border-border/50 rounded-lg bg-card/50">
      <div className="text-xs font-medium text-foreground">New Task</div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
        placeholder="Task title..."
        className="w-full bg-muted/40 border border-input rounded-md px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        autoFocus
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)..."
        rows={3}
        className="w-full bg-muted/40 border border-input rounded-md px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y"
      />

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-muted-foreground mb-0.5 block">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="w-full bg-muted/40 border border-input rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        {agents.length > 0 && (
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Assign to</label>
            <select
              value={assignedAgent}
              onChange={(e) => setAssignedAgent(e.target.value)}
              className="w-full bg-muted/40 border border-input rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.connectionId} value={a.agentName}>{a.agentName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || submitting}
          className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Task"}
        </button>
      </div>
    </div>
  );
}
