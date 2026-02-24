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
  ablyChannelName: string;  // "jaibber:project:{id}"
  isOnline: boolean;        // from Ably presence on project channel
  lastSeen: string | null;
  role: "admin" | "member";
  onlineAgents: AgentInfo[];  // agents currently online for this project
}
