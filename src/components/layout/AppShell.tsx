import { useState } from "react";
import { ContactList } from "@/components/contacts/ContactList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { ProjectsPanel } from "@/components/projects/ProjectsPanel";
import { useAbly } from "@/hooks/useAbly";

type RightPanel = "chat" | "settings" | "projects";

export function AppShell() {
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>("chat");

  // Initialize Ably connection + presence + project channel listeners
  useAbly();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Left sidebar — contacts list */}
      <div className="w-64 flex-shrink-0">
        <ContactList
          activeId={activeContactId}
          onSelect={(id) => { setActiveContactId(id); setRightPanel("chat"); }}
          onOpenSettings={() => setRightPanel("settings")}
          onOpenProjects={() => setRightPanel("projects")}
        />
      </div>

      {/* Right — chat area, settings, or projects panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {rightPanel === "settings" ? (
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="flex items-center gap-3 px-6 pt-6 pb-2">
              <button
                onClick={() => setRightPanel("chat")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            </div>
            <SettingsPage />
          </div>
        ) : rightPanel === "projects" ? (
          <div className="flex flex-col h-full overflow-y-auto">
            <div className="flex items-center gap-3 px-6 pt-6 pb-2">
              <button
                onClick={() => setRightPanel("chat")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            </div>
            <ProjectsPanel />
          </div>
        ) : activeContactId ? (
          <ChatWindow contactId={activeContactId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="text-5xl">💬</div>
            <h2 className="text-xl font-semibold text-foreground">
              Select a project to chat
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Projects you have access to appear in the sidebar. Use the folder icon to register this machine as a responder.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
