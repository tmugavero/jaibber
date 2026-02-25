// Re-export platform-abstracted functions so existing imports keep working.
// On Tauri: calls invoke(). On web: uses localStorage / throws for agent.
export { getSettings, saveSettings, runAgent } from "@/lib/platform";
