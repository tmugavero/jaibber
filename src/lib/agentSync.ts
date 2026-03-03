/**
 * Agent Registration Sync — syncs local project agent registrations
 * to the server so they survive reinstalls. On fresh install, server
 * registrations are restored locally with empty projectDir for re-linking.
 */
import { useProjectStore, type LocalProject } from "@/stores/projectStore";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useContactStore } from "@/stores/contactStore";
import { storage } from "@/lib/platform";

interface AgentRegistration {
  id: string;
  userId: string;
  projectId: string;
  agentName: string;
  agentInstructions: string;
  agentProvider: string;
  customCommand: string | null;
  machineName: string | null;
}

function getApiConfig() {
  const { token } = useAuthStore.getState();
  const { apiBaseUrl } = useSettingsStore.getState().settings;
  return { token, apiBaseUrl };
}

/** Fetch all agent registrations for the current user from the server. */
async function fetchRegistrations(): Promise<AgentRegistration[]> {
  const { token, apiBaseUrl } = getApiConfig();
  if (!token || !apiBaseUrl) return [];

  try {
    const res = await fetch(`${apiBaseUrl}/api/agent-registrations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const body = await res.json();
    return body.data ?? [];
  } catch {
    return [];
  }
}

/** Push a local project registration to the server (fire-and-forget). */
export function pushRegistration(lp: LocalProject): void {
  const { token, apiBaseUrl } = getApiConfig();
  if (!token || !apiBaseUrl) return;

  const { machineName } = useSettingsStore.getState().settings;

  fetch(`${apiBaseUrl}/api/agent-registrations`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      projectId: lp.projectId,
      agentName: lp.agentName,
      agentInstructions: lp.agentInstructions,
      agentProvider: lp.agentProvider,
      customCommand: lp.customCommand || null,
      machineName: machineName || null,
    }),
  }).catch(() => {});
}

/** Remove a registration from the server (fire-and-forget). */
export function deleteRegistration(
  projectId: string,
  agentName?: string,
): void {
  const { token, apiBaseUrl } = getApiConfig();
  if (!token || !apiBaseUrl) return;

  const params = new URLSearchParams({ projectId });
  if (agentName) params.set("agentName", agentName);

  fetch(`${apiBaseUrl}/api/agent-registrations?${params}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

/**
 * Bi-directional sync: called once during boot after local projects are loaded.
 *
 * 1. Fetch server registrations
 * 2. Server-only → add to local store with empty projectDir (needs re-link)
 * 3. Local-only → push to server
 * 4. Both exist → local is source of truth, push config diffs to server
 */
export async function syncRegistrations(): Promise<void> {
  const serverRegs = await fetchRegistrations();
  const localProjects = useProjectStore.getState().projects;

  if (serverRegs.length === 0 && localProjects.length === 0) return;

  const contacts = useContactStore.getState().contacts;

  // Build lookup: "projectId::agentName"
  const localByKey = new Map<string, LocalProject>();
  for (const lp of localProjects) {
    localByKey.set(`${lp.projectId}::${lp.agentName}`, lp);
  }

  const serverByKey = new Map<string, AgentRegistration>();
  for (const reg of serverRegs) {
    serverByKey.set(`${reg.projectId}::${reg.agentName}`, reg);
  }

  // 1. Server-only: restore to local store with empty projectDir
  const restored: LocalProject[] = [];
  for (const [key, reg] of serverByKey) {
    if (localByKey.has(key)) continue;

    // Only restore if user still has access (project is in contacts)
    const contact = contacts[reg.projectId];
    if (!contact) continue;

    restored.push({
      projectId: reg.projectId,
      name: contact.name,
      projectDir: "",
      ablyChannelName: contact.ablyChannelName,
      agentName: reg.agentName,
      agentInstructions: reg.agentInstructions,
      agentProvider: reg.agentProvider,
      customCommand: reg.customCommand ?? undefined,
    });
  }

  if (restored.length > 0) {
    for (const lp of restored) {
      useProjectStore.getState().addProject(lp);
    }
    await storage.set("local_projects", useProjectStore.getState().projects);
  }

  // 2. Local-only: push to server
  for (const [key, lp] of localByKey) {
    if (!serverByKey.has(key)) {
      pushRegistration(lp);
    }
  }

  // 3. Both exist: push local if config differs
  for (const [key, lp] of localByKey) {
    const reg = serverByKey.get(key);
    if (!reg) continue;

    const differs =
      reg.agentInstructions !== lp.agentInstructions ||
      reg.agentProvider !== lp.agentProvider ||
      (reg.customCommand ?? "") !== (lp.customCommand ?? "");

    if (differs) {
      pushRegistration(lp);
    }
  }
}
