import { create } from "zustand";
import type { AppSettings } from "@/types/settings";

const DEFAULT_SETTINGS: AppSettings = {
  anthropicApiKey: null,
  openaiApiKey: null,
  googleApiKey: null,
  machineName: "",
  apiBaseUrl: "https://api.jaibber.com",
};

interface SettingsStore {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  setSettings: (settings) => set({ settings }),
}));
