import { formatDistanceToNow, format } from "date-fns";

export function timeAgo(isoDate: string): string {
  return formatDistanceToNow(new Date(isoDate), { addSuffix: true });
}

export function formatDate(isoDate: string): string {
  return format(new Date(isoDate), "MMM d, HH:mm");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
