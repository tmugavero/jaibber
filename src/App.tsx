import { useEffect, useState } from "react";
import "./App.css";
import { isSetupComplete, getSettings } from "@/lib/tauri";
import { useSettingsStore } from "@/stores/settingsStore";
import { AppShell } from "@/components/layout/AppShell";
import { SetupWizard } from "@/components/setup/SetupWizard";

function App() {
  const [setupDone, setSetupDone] = useState<boolean | null>(null);

  useEffect(() => {
    Promise.all([isSetupComplete(), getSettings()])
      .then(([done, settings]) => {
        // Use getState() — never subscribe this component to store changes
        useSettingsStore.getState().setSetupComplete(done);
        useSettingsStore.getState().setSettings(settings);
        setSetupDone(done);
      })
      .catch(() => setSetupDone(false));
  }, []);

  if (setupDone === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-muted-foreground text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!setupDone) {
    // Pass onComplete as a plain callback — no Zustand subscription in App
    return <SetupWizard onComplete={() => setSetupDone(true)} />;
  }

  return <AppShell />;
}

export default App;
