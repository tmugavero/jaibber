import { create } from "zustand";
import type { AppSettings } from "@/types/settings";

const DEFAULT_SETTINGS: AppSettings = {
  anthropicApiKey: null,
  machineName: "",
  apiBaseUrl: "",
};

interface SettingsStore {
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  setSettings: (settings) => set({ settings }),
}));
