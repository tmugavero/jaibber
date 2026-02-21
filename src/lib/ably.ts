import Ably from "ably";

let client: Ably.Realtime | null = null;

export function initAbly(apiKey: string, clientId: string): Ably.Realtime {
  if (client) {
    client.close();
  }
  client = new Ably.Realtime({
    key: apiKey,
    clientId,
    // Use token auth in production; for dev/hobby the API key is fine
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
