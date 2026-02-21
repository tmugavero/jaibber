import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "@/types/settings";

// Settings
export const getSettings = () => invoke<AppSettings>("get_settings");
export const saveSettings = (settings: AppSettings) =>
  invoke<void>("save_settings", { settings });
export const isSetupComplete = () => invoke<boolean>("is_setup_complete");

// Claude process
export const runClaude = (prompt: string) =>
  invoke<string>("run_claude", { prompt });
