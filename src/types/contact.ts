export interface Contact {
  id: string;        // unique handle, e.g. "my-api-project"
  name: string;      // display name (same as id for now)
  mode: "hub" | "agent";
  isOnline: boolean;
  lastSeen: string | null;
  projectDir?: string;
}
