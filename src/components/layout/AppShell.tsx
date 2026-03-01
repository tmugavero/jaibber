import { useState, useEffect, useCallback } from "react";
import { ContactList } from "@/components/contacts/ContactList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { SettingsPane } from "@/components/settings/SettingsPane";
import { useAbly } from "@/hooks/useAbly";
import { useOrgStore } from "@/stores/orgStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";

type AppView = "main" | "settings";

/** Parse window.location.hash into view + optional params */
function parseHash(): { view: AppView; contactId: string | null } {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash === "settings") return { view: "settings", contactId: null };
  if (hash.startsWith("chat/")) {
    const id = hash.slice(5);
    return { view: "main", contactId: id || null };
  }
  return { view: "main", contactId: null };
}

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
  const initial = parseHash();
  const [activeContactId, setActiveContactId] = useState<string | null>(initial.contactId);
  const [view, setView] = useState<AppView>(initial.view);
  const [showSidebar, setShowSidebar] = useState(true);
  const isMobile = useIsMobile();

  // Sync hash → state on browser back/forward
  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHash();
      setView(parsed.view);
      if (parsed.contactId) {
        setActiveContactId(parsed.contactId);
        if (isMobile) setShowSidebar(false);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [isMobile]);

  // Update hash when view or contact changes (without triggering hashchange loop)
  const navigate = useCallback((newView: AppView, contactId?: string | null) => {
    setView(newView);
    if (newView === "settings") {
      window.history.pushState(null, "", "#settings");
    } else if (contactId) {
      window.history.pushState(null, "", `#chat/${contactId}`);
    } else {
      window.history.pushState(null, "", window.location.pathname);
    }
  }, []);

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
    navigate("main", id);
    if (isMobile) setShowSidebar(false);
  };

  // Settings view takes over the entire screen
  if (view === "settings") {
    return <SettingsPane onClose={() => navigate("main", activeContactId)} />;
  }

  // Mobile: show either sidebar or content, not both
  if (isMobile) {
    return (
      <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-background">
        {showSidebar ? (
          <ContactList
            activeId={activeContactId}
            onSelect={handleSelectContact}
            onOpenSettings={() => navigate("settings")}
          />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeContactId ? (
              <ChatWindow
                contactId={activeContactId}
                onBack={() => setShowSidebar(true)}
              />
            ) : (
              <EmptyState />
            )}
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
          onOpenSettings={() => navigate("settings")}
        />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeContactId ? (
          <ChatWindow contactId={activeContactId} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-6">
      <div className="text-5xl">&#x1F4AC;</div>
      <h2 className="text-xl font-semibold text-foreground">
        Select a project to chat
      </h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        Projects you have access to appear in the sidebar. Open Settings to register this machine as a responder.
      </p>
    </div>
  );
}
