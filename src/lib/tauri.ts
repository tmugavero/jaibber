import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "@/types/settings";

// Settings
export const getSettings = () => invoke<AppSettings>("get_settings");
export const saveSettings = (settings: AppSettings) =>
  invoke<void>("save_settings", { settings });

// Claude process — projectDir is now passed per-call (not stored globally in Rust)
export const runClaude = (prompt: string, projectDir: string) =>
  invoke<string>("run_claude", { prompt, projectDir });
