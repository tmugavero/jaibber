export interface AgentInfo {
  connectionId: string;
  agentName: string;
  machineName?: string;
  agentInstructions?: string;
}

export interface Contact {
  id: string;               // projectId UUID
  name: string;             // project name from server
  description: string | null;
  ownerId: string | null;   // project creator's userId
  orgId: string | null;     // organization this project belongs to
  ablyChannelName: string;  // "jaibber:project:{id}"
  isOnline: boolean;        // from Ably presence on project channel
  lastSeen: string | null;
  role: "admin" | "member" | "org-admin";
  onlineAgents: AgentInfo[];  // agents currently online for this project
  createdAt: string | null;   // ISO timestamp from server
  memberCount: number | null; // number of members from server
}
