export interface AppSettings {
  ablyApiKey: string | null;
  anthropicApiKey: string | null;
  myHandle: string;
  myMode: "hub" | "agent";
  projectDir: string | null;
}
