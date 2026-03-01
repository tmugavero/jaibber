import { create } from "zustand";
import type { Org, OrgStats, OrgAgent } from "@/types/org";

interface OrgStore {
  orgs: Org[];
  activeOrgId: string | null;
  stats: OrgStats | null;
  agents: OrgAgent[];
  loadingStats: boolean;
  loadingAgents: boolean;

  loadOrgs: (apiBaseUrl: string, token: string) => Promise<void>;
  setActiveOrg: (orgId: string | null) => void;
  loadStats: (apiBaseUrl: string, token: string, orgId: string, range?: string) => Promise<void>;
  loadAgents: (apiBaseUrl: string, token: string, orgId: string) => Promise<void>;
  createOrg: (apiBaseUrl: string, token: string, name: string) => Promise<Org>;
}

export const useOrgStore = create<OrgStore>((set) => ({
  orgs: [],
  activeOrgId: null,
  stats: null,
  agents: [],
  loadingStats: false,
  loadingAgents: false,

  loadOrgs: async (apiBaseUrl, token) => {
    const res = await fetch(`${apiBaseUrl}/api/orgs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to load orgs: ${res.status}`);
    const { orgs } = await res.json();
    set({ orgs });
    // Auto-select first org if none active
    if (orgs.length > 0) {
      const current = useOrgStore.getState().activeOrgId;
      if (!current || !orgs.find((o: Org) => o.id === current)) {
        set({ activeOrgId: orgs[0].id });
      }
    }
  },

  setActiveOrg: (orgId) => set({ activeOrgId: orgId, stats: null, agents: [] }),

  loadStats: async (apiBaseUrl, token, orgId, range = "7d") => {
    set({ loadingStats: true });
    try {
      const res = await fetch(`${apiBaseUrl}/api/orgs/${orgId}/stats?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load stats: ${res.status}`);
      const stats = await res.json();
      set({ stats });
    } finally {
      set({ loadingStats: false });
    }
  },

  loadAgents: async (apiBaseUrl, token, orgId) => {
    set({ loadingAgents: true });
    try {
      const res = await fetch(`${apiBaseUrl}/api/orgs/${orgId}/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load agents: ${res.status}`);
      const json = await res.json();
      // Server returns { data: { registered, live }, meta } via api.success()
      const agents = json.data?.live ?? json.live ?? json.agents ?? [];
      set({ agents });
    } finally {
      set({ loadingAgents: false });
    }
  },

  createOrg: async (apiBaseUrl, token, name) => {
    const res = await fetch(`${apiBaseUrl}/api/orgs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to create org");
    }
    const { org } = await res.json();
    // Reload orgs list
    await useOrgStore.getState().loadOrgs(apiBaseUrl, token);
    return org;
  },
}));
