import { create } from "zustand";
import type { AppSettings } from "@/types/settings";

const DEFAULT_SETTINGS: AppSettings = {
  ablyApiKey: null,
  anthropicApiKey: null,
  myHandle: "",
  myMode: "hub",
  projectDir: null,
};

interface SettingsStore {
  settings: AppSettings;
  setupComplete: boolean;
  setSettings: (settings: AppSettings) => void;
  setSetupComplete: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  setupComplete: false,
  setSettings: (settings) => set({ settings }),
  setSetupComplete: (setupComplete) => set({ setupComplete }),
}));
