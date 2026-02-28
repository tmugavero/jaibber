import type {
  Project,
  ServerMessage,
  PersistMessagePayload,
  Task,
} from "./types.js";

/**
 * REST API client wrapping the Jaibber server endpoints.
 * Handles JWT auth (login), project listing, message persistence,
 * task updates, and Ably token requests.
 */
export class JaibberClient {
  private serverUrl: string;
  private jwt: string | null = null;

  userId: string | null = null;
  username: string | null = null;

  constructor(serverUrl: string) {
    // Strip trailing slash
    this.serverUrl = serverUrl.replace(/\/+$/, "");
  }

  // ── Auth ────────────────────────────────────────────────────────────

  /** POST /api/auth/token — login with credentials, stores JWT. */
  async login(username: string, password: string): Promise<void> {
    const res = await fetch(`${this.serverUrl}/api/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401) {
        throw new Error("Invalid credentials. Check username and password.");
      }
      throw new Error(`Login failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      token: string;
      userId: string;
      username: string;
    };
    this.jwt = data.token;
    this.userId = data.userId;
    this.username = data.username;
  }

  get isAuthenticated(): boolean {
    return this.jwt !== null;
  }

  private authHeaders(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.jwt) {
      h["Authorization"] = `Bearer ${this.jwt}`;
    }
    return h;
  }

  // ── Projects ────────────────────────────────────────────────────────

  /** GET /api/projects — list all projects user is member of. */
  async listProjects(): Promise<Project[]> {
    const res = await fetch(`${this.serverUrl}/api/projects`, {
      headers: this.authHeaders(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to list projects (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      projects: Array<{
        id: string;
        name: string;
        description: string | null;
        ablyChannelName: string;
        role: string;
      }>;
    };

    return data.projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      ablyChannelName: p.ablyChannelName,
      role: p.role,
    }));
  }

  // ── Ably token ──────────────────────────────────────────────────────

  /** POST /api/ably/token — get scoped Ably TokenRequest. */
  async getAblyToken(): Promise<object> {
    const res = await fetch(`${this.serverUrl}/api/ably/token`, {
      method: "POST",
      headers: this.authHeaders(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to get Ably token (${res.status}): ${text}`);
    }

    return res.json() as Promise<object>;
  }

  // ── Messages ────────────────────────────────────────────────────────

  /**
   * POST /api/projects/{id}/messages — persist a message (idempotent).
   * Passing a client-generated `id` makes the server skip Ably re-publish.
   */
  async persistMessage(
    projectId: string,
    msg: PersistMessagePayload,
  ): Promise<void> {
    const res = await fetch(
      `${this.serverUrl}/api/projects/${projectId}/messages`,
      {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify(msg),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(
        `[sdk] Failed to persist message (${res.status}): ${text}`,
      );
    }
  }

  /** GET /api/projects/{id}/messages — fetch recent messages. */
  async fetchMessages(
    projectId: string,
    limit = 20,
  ): Promise<ServerMessage[]> {
    const res = await fetch(
      `${this.serverUrl}/api/projects/${projectId}/messages?limit=${limit}`,
      { headers: this.authHeaders() },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch messages (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { data: ServerMessage[] };
    return data.data;
  }

  // ── Tasks ───────────────────────────────────────────────────────────

  /** PATCH /api/tasks/{taskId} — update task fields. */
  async updateTask(
    taskId: string,
    updates: Partial<Task>,
  ): Promise<void> {
    const res = await fetch(`${this.serverUrl}/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: this.authHeaders(),
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[sdk] Failed to update task (${res.status}): ${text}`);
    }
  }
}
