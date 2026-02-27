export interface AppSettings {
  anthropicApiKey: string | null;  // fallback API key for Claude CLI
  openaiApiKey: string | null;     // fallback API key for Codex CLI
  googleApiKey: string | null;     // fallback API key for Gemini CLI
  machineName: string;             // cosmetic label for this device
  apiBaseUrl: string;              // "https://jaibber-server.vercel.app"
}
