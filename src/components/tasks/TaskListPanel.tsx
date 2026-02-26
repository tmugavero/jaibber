import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTaskStore } from "@/stores/taskStore";
import { fetchTasks } from "@/lib/taskApi";
import { TaskCard } from "./TaskCard";
import { CreateTaskForm } from "./CreateTaskForm";
import { TaskDetailPanel } from "./TaskDetailPanel";
import type { TaskStatus } from "@/types/task";

const filterOptions: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "working", label: "Working" },
  { value: "input-required", label: "Needs Input" },
  { value: "completed", label: "Done" },
  { value: "failed", label: "Failed" },
];

interface Props {
  projectId: string;
  /** If set, open create form pre-filled with this data */
  createFromMessage?: { title: string; description: string; sourceMessageId: string } | null;
  onCreateFromMessageHandled: () => void;
}

export function TaskListPanel({ projectId, createFromMessage, onCreateFromMessageHandled }: Props) {
  const tasks = useTaskStore((s) => s.tasks[projectId]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Load tasks on mount
  useEffect(() => {
    const { token } = useAuthStore.getState();
    const { apiBaseUrl } = useSettingsStore.getState().settings;
    if (!token || !apiBaseUrl) return;

    setLoading(true);
    fetchTasks(apiBaseUrl, token, projectId)
      .then(({ tasks: serverTasks }) => {
        useTaskStore.getState().loadTasks(projectId, serverTasks);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  // Handle "create from message" trigger
  useEffect(() => {
    if (createFromMessage) {
      setShowCreate(true);
    }
  }, [createFromMessage]);

  const filteredTasks = filter === "all"
    ? (tasks ?? [])
    : (tasks ?? []).filter((t) => t.status === filter);

  const selectedTask = selectedTaskId
    ? (tasks ?? []).find((t) => t.id === selectedTaskId) ?? null
    : null;

  // If a task is selected, show detail view
  if (selectedTask) {
    return (
      <TaskDetailPanel
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        onDeleted={() => setSelectedTaskId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header: filter + new task button */}
      <div className="px-3 py-2.5 border-b border-border/50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                  filter === opt.value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowCreate(true); onCreateFromMessageHandled(); }}
            className="px-2.5 py-1 text-[11px] bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-all flex-shrink-0"
          >
            + New
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="px-3 py-2.5">
          <CreateTaskForm
            projectId={projectId}
            initialTitle={createFromMessage?.title}
            initialDescription={createFromMessage?.description}
            sourceMessageId={createFromMessage?.sourceMessageId}
            onCreated={() => { setShowCreate(false); onCreateFromMessageHandled(); }}
            onCancel={() => { setShowCreate(false); onCreateFromMessageHandled(); }}
          />
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {loading && (
          <div className="text-center text-xs text-muted-foreground py-4 animate-pulse">
            Loading tasks...
          </div>
        )}
        {!loading && filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-1">
            <span>No tasks yet</span>
            <span className="text-xs">Create one to get started</span>
          </div>
        )}
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isSelected={task.id === selectedTaskId}
            onClick={() => setSelectedTaskId(task.id)}
          />
        ))}
      </div>
    </div>
  );
}
