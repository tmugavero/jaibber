import type { Task, TaskStatus, TaskPriority } from "@/types/task";

const statusLabels: Record<TaskStatus, string> = {
  submitted: "Submitted",
  working: "Working",
  "input-required": "Input Required",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

const statusColors: Record<TaskStatus, string> = {
  submitted: "bg-muted text-muted-foreground",
  working: "bg-blue-500/10 text-blue-500",
  "input-required": "bg-amber-500/10 text-amber-600",
  completed: "bg-emerald-500/10 text-emerald-600",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground/60",
};

const priorityColors: Record<TaskPriority, string> = {
  low: "bg-muted-foreground/30",
  medium: "bg-blue-400",
  high: "bg-amber-500",
  urgent: "bg-red-500",
};

interface Props {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
}

export function TaskCard({ task, isSelected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
        isSelected
          ? "border-primary/50 bg-primary/5"
          : "border-border/50 bg-card/50 hover:bg-muted/30"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${priorityColors[task.priority]}`} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{task.title}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[task.status]}`}>
              {statusLabels[task.status]}
            </span>
            {task.assignedAgentName && (
              <span className="text-[10px] text-muted-foreground truncate">
                {task.assignedAgentName}
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground flex-shrink-0">
          {new Date(task.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
        </span>
      </div>
    </button>
  );
}
