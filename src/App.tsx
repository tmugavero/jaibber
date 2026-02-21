import { useEffect, useState } from "react";
import "./App.css";
import { isSetupComplete, getSettings } from "@/lib/tauri";
import { loadMessages } from "@/lib/chatPersistence";
import { useSettingsStore } from "@/stores/settingsStore";
import { useChatStore } from "@/stores/chatStore";
import { AppShell } from "@/components/layout/AppShell";
import { SetupWizard } from "@/components/setup/SetupWizard";

function App() {
  const [setupDone, setSetupDone] = useState<boolean | null>(null);

  useEffect(() => {
    // Run sequentially: isSetupComplete loads settings into Rust state,
    // then getSettings reads that state. Running in parallel caused a race
    // where getSettings returned empty defaults before the store was loaded.
    (async () => {
      try {
        const done = await isSetupComplete();
        const settings = await getSettings();
        const messages = await loadMessages();
        useSettingsStore.getState().setSetupComplete(done);
        useSettingsStore.getState().setSettings(settings);
        useChatStore.getState().loadMessages(messages);
        setSetupDone(done);
      } catch {
        setSetupDone(false);
      }
    })();
  }, []);

  if (setupDone === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-muted-foreground text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!setupDone) {
    return <SetupWizard onComplete={() => setSetupDone(true)} />;
  }

  return <AppShell />;
}

export default App;
