import { useState } from "react";
import { ContactList } from "@/components/contacts/ContactList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { useAbly } from "@/hooks/useAbly";

export function AppShell() {
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize Ably connection + presence + DM listener
  useAbly();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Left sidebar — contacts list */}
      <div className="w-64 flex-shrink-0">
        <ContactList
          activeId={activeContactId}
          onSelect={(id) => { setActiveContactId(id); setShowSettings(false); }}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      {/* Right — chat area or settings */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {showSettings ? (
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="flex items-center gap-3 px-6 pt-6 pb-2">
              <button
                onClick={() => setShowSettings(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            </div>
            <SettingsPage />
          </div>
        ) : activeContactId ? (
          <ChatWindow contactId={activeContactId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="text-5xl">💬</div>
            <h2 className="text-xl font-semibold text-foreground">
              Select a contact to chat
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Online agents will appear in the sidebar. Open Jaibber on another machine to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
