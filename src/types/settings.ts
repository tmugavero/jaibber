export interface AppSettings {
  anthropicApiKey: string | null;  // needed on machines that run Claude locally
  machineName: string;             // cosmetic label for this device
  apiBaseUrl: string;              // "https://jaibber-server.vercel.app"
}
