import { useState, useEffect } from "react";
import { ContactList } from "@/components/contacts/ContactList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { ProjectsPanel } from "@/components/projects/ProjectsPanel";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { BillingPage } from "@/components/billing/BillingPage";
import { useAbly } from "@/hooks/useAbly";
import { useOrgStore } from "@/stores/orgStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";

type RightPanel = "chat" | "settings" | "projects" | "admin" | "billing";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export function AppShell() {
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>("chat");
  const [showSidebar, setShowSidebar] = useState(true);
  const isMobile = useIsMobile();

  // Initialize Ably connection + presence + project channel listeners
  useAbly();

  // Load orgs on mount
  useEffect(() => {
    const { apiBaseUrl } = useSettingsStore.getState().settings;
    const { token } = useAuthStore.getState();
    if (apiBaseUrl && token) {
      useOrgStore.getState().loadOrgs(apiBaseUrl, token).catch(() => {});
    }
  }, []);

  // On mobile, selecting a contact hides the sidebar
  const handleSelectContact = (id: string) => {
    setActiveContactId(id);
    setRightPanel("chat");
    if (isMobile) setShowSidebar(false);
  };

  const handleBack = () => {
    if (isMobile) {
      setShowSidebar(true);
    }
    setRightPanel("chat");
  };

  const handleOpenPanel = (panel: RightPanel) => {
    setRightPanel(panel);
    if (isMobile) setShowSidebar(false);
  };

  const BackButton = () => (
    <div className="flex items-center gap-3 px-6 pt-6 pb-2">
      <button
        onClick={handleBack}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center"
      >
        ← Back
      </button>
    </div>
  );

  const renderRightPanel = () => {
    switch (rightPanel) {
      case "settings":
        return (
          <div className="flex flex-col h-full overflow-y-auto">
            <BackButton />
            <SettingsPage />
          </div>
        );
      case "projects":
        return (
          <div className="flex flex-col h-full overflow-y-auto">
            <BackButton />
            <ProjectsPanel />
          </div>
        );
      case "admin":
        return (
          <div className="flex flex-col h-full overflow-y-auto">
            <BackButton />
            <AdminConsole />
          </div>
        );
      case "billing":
        return (
          <div className="flex flex-col h-full overflow-y-auto">
            <BackButton />
            <BillingPage />
          </div>
        );
      case "chat":
      default:
        if (activeContactId) {
          return (
            <ChatWindow
              contactId={activeContactId}
              onBack={isMobile ? () => setShowSidebar(true) : undefined}
            />
          );
        }
        return (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-6">
            <div className="text-5xl">&#x1F4AC;</div>
            <h2 className="text-xl font-semibold text-foreground">
              Select a project to chat
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Projects you have access to appear in the sidebar. Use the folder icon to register this machine as a responder.
            </p>
          </div>
        );
    }
  };

  // Mobile: show either sidebar or content, not both
  if (isMobile) {
    return (
      <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-background">
        {showSidebar ? (
          <ContactList
            activeId={activeContactId}
            onSelect={handleSelectContact}
            onOpenSettings={() => handleOpenPanel("settings")}
            onOpenProjects={() => handleOpenPanel("projects")}
            onOpenAdmin={() => handleOpenPanel("admin")}
            onOpenBilling={() => handleOpenPanel("billing")}
          />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {renderRightPanel()}
          </div>
        )}
      </div>
    );
  }

  // Desktop: sidebar + content side by side
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <div className="w-64 flex-shrink-0">
        <ContactList
          activeId={activeContactId}
          onSelect={handleSelectContact}
          onOpenSettings={() => setRightPanel("settings")}
          onOpenProjects={() => setRightPanel("projects")}
          onOpenAdmin={() => setRightPanel("admin")}
          onOpenBilling={() => setRightPanel("billing")}
        />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderRightPanel()}
      </div>
    </div>
  );
}
