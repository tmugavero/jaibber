import { formatDistance } from "date-fns";
import type { AuditEntry, Org } from "@/types/org";

interface Props {
  entries: AuditEntry[];
  loading: boolean;
  org: Org;
}

const ACTION_ICONS: Record<string, string> = {
  "message.send": "\uD83D\uDCAC",
  "task.create": "\uD83D\uDCCB",
  "task.update": "\u2705",
  "task.delete": "\uD83D\uDDD1\uFE0F",
  "agent.register": "\uD83E\uDD16",
  "api_key.create": "\uD83D\uDD11",
  "attachment.upload": "\uD83D\uDCCE",
  "webhook.create": "\uD83D\uDD17",
};

function formatAction(action: string): string {
  return action
    .replace(/\./g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const icon = ACTION_ICONS[entry.action] ?? "\u25CF";
  const details = entry.details as Record<string, string> | null;
  const resourceLabel =
    details?.name ?? details?.title ?? details?.projectName ?? entry.resourceType ?? "";

  let timeAgo: string;
  try {
    timeAgo = formatDistance(new Date(entry.createdAt), new Date(), { addSuffix: true });
  } catch {
    timeAgo = "";
  }

  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0">
      <span className="text-sm flex-shrink-0 mt-0.5 w-5 text-center">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-foreground">
          <span className="font-medium">{formatAction(entry.action)}</span>
          {resourceLabel && (
            <span className="text-muted-foreground ml-1">- {resourceLabel}</span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {entry.actorType === "system" ? "System" : entry.actorType === "apiKey" ? "API Key" : "User"}{" "}
          {timeAgo}
        </div>
      </div>
    </div>
  );
}

export function AuditFeed({ entries, loading, org }: Props) {
  if (org.plan !== "team") {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Recent Activity</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="text-2xl mb-2">&#128202;</div>
          <div className="text-xs text-muted-foreground mb-1">
            Activity feed available on Team plan
          </div>
          <div className="text-[10px] text-muted-foreground">
            Upgrade to see detailed audit logs
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">Recent Activity</h3>
      {loading ? (
        <div className="text-xs text-muted-foreground animate-pulse py-4 text-center">
          Loading activity...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center">
          No recent activity
        </div>
      ) : (
        <div className="max-h-[280px] overflow-y-auto">
          {entries.map((entry) => (
            <AuditRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
