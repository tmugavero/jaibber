import Ably from "ably";

let client: Ably.Realtime | null = null;

/**
 * Initialize Ably using token auth (server issues scoped tokens).
 * The authUrl is called automatically by Ably whenever a new token is needed.
 * @param apiBaseUrl - Base URL of the jaibber-server (e.g. "https://jaibber-server.vercel.app")
 * @param userId    - The authenticated user's UUID (becomes Ably clientId)
 * @param getToken  - Function that returns the current bearer token for the auth header
 */
export function initAbly(
  apiBaseUrl: string,
  userId: string,
  getToken: () => string | null
): Ably.Realtime {
  if (client) {
    client.close();
  }
  client = new Ably.Realtime({
    authUrl: `${apiBaseUrl}/api/ably/token`,
    authMethod: "POST",
    authHeaders: {
      Authorization: `Bearer ${getToken()}`,
    },
    clientId: userId,
  });
  return client;
}

export function getAbly(): Ably.Realtime | null {
  return client;
}

export function closeAbly(): void {
  if (client) {
    client.close();
    client = null;
  }
}
