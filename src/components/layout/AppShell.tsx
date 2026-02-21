import { useState } from "react";
import { ContactList } from "@/components/contacts/ContactList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useAbly } from "@/hooks/useAbly";

export function AppShell() {
  const [activeContactId, setActiveContactId] = useState<string | null>(null);

  // Initialize Ably connection + presence + DM listener
  useAbly();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Left sidebar — contacts list */}
      <div className="w-64 flex-shrink-0">
        <ContactList activeId={activeContactId} onSelect={setActiveContactId} />
      </div>

      {/* Right — chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeContactId ? (
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
