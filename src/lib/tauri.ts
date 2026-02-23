// Re-export platform-abstracted functions so existing imports keep working.
// On Tauri: calls invoke(). On web: uses localStorage / throws for Claude.
export { getSettings, saveSettings, runClaude } from "@/lib/platform";
