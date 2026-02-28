export interface Org {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "pro" | "team";
  role: "owner" | "admin" | "member";
  maxProjects: number;
  maxMembers: number;
  maxAgents: number;
  maxMessagesPerDay: number;
  maxStorageBytes: number;
  maxApiKeys: number;
  maxWebhooks: number;
  messageRetentionDays: number;
  stripeQuantity: number;
  createdAt: string;
}

export interface OrgStats {
  range: string;
  totalPrompts: number;
  totalResponses: number;
  totalErrors: number;
  totalTokens: number;
  avgDurationMs: number;
  errorRate: number;
  byProject: Array<{
    projectId: string;
    projectName: string;
    prompts: number;
    responses: number;
    errors: number;
    tokens: number;
  }>;
  byDay: Array<{
    date: string;
    prompts: number;
    responses: number;
    errors: number;
  }>;
}

export interface OrgAgent {
  projectId: string;
  projectName: string;
  clientId: string;
  connectionId: string;
  data: { userId?: string; username?: string; projectIds?: string[] } | null;
}
