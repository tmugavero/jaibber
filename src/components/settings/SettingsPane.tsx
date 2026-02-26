import { useState, useEffect } from "react";
import { isTauri } from "@/lib/platform";
import { useOrgStore } from "@/stores/orgStore";
import { GeneralSection } from "./sections/GeneralSection";
import { SecuritySection } from "./sections/SecuritySection";
import { ProjectsSection } from "./sections/ProjectsSection";
import { OrganizationSection } from "./sections/OrganizationSection";
import { BillingSection } from "./sections/BillingSection";
import { AnalyticsSection } from "./sections/AnalyticsSection";
import { ApiKeysSection } from "./sections/ApiKeysSection";
import { cn } from "@/lib/cn";

type Section =
  | "general"
  | "security"
  | "projects"
  | "organization"
  | "api-keys"
  | "billing"
  | "analytics";

interface NavItem {
  id: Section;
  label: string;
  adminOnly?: boolean;
  desktopOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "general", label: "General" },
  { id: "security", label: "Security" },
  { id: "projects", label: "Projects" },
  { id: "organization", label: "Organization" },
  { id: "api-keys", label: "API Keys", adminOnly: true },
  { id: "billing", label: "Billing", adminOnly: true },
  { id: "analytics", label: "Analytics", adminOnly: true },
];

interface Props {
  onClose: () => void;
  initialSection?: Section;
}

export function SettingsPane({ onClose, initialSection = "general" }: Props) {
  const [activeSection, setActiveSection] = useState<Section>(initialSection);
  const [mobileShowContent, setMobileShowContent] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const activeOrg = useOrgStore((s) => s.orgs.find((o) => o.id === s.activeOrgId));
  const canAccessAdmin = activeOrg?.role === "owner" || activeOrg?.role === "admin";

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.desktopOnly && !isTauri) return false;
    if (item.adminOnly && !canAccessAdmin) return false;
    return true;
  });

  const handleNavClick = (section: Section) => {
    setActiveSection(section);
    if (isMobile) setMobileShowContent(true);
  };

  const handleMobileBack = () => {
    setMobileShowContent(false);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "general": return <GeneralSection />;
      case "security": return <SecuritySection />;
      case "projects": return <ProjectsSection />;
      case "organization": return <OrganizationSection />;
      case "api-keys": return <ApiKeysSection />;
      case "billing": return <BillingSection />;
      case "analytics": return <AnalyticsSection />;
    }
  };

  // Mobile: either show nav list or content
  if (isMobile) {
    if (mobileShowContent) {
      return (
        <div className="flex flex-col h-[100dvh] w-screen bg-background">
          {/* Mobile header with back */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <button
              onClick={handleMobileBack}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span className="ml-1">Settings</span>
            </button>
            <span className="text-sm font-medium text-foreground capitalize">
              {visibleItems.find((i) => i.id === activeSection)?.label}
            </span>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {renderContent()}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-[100dvh] w-screen bg-background">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Nav list */}
        <div className="flex-1 overflow-y-auto p-2">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm text-foreground hover:bg-muted/40 transition-colors"
            >
              <span>{item.label}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Desktop: sidebar nav + content
  return (
    <div className="flex h-screen w-screen bg-background">
      {/* Left nav sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-border flex flex-col">
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors mb-0.5",
                activeSection === item.id
                  ? "bg-muted/50 text-foreground font-medium border-l-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with close */}
        <div className="flex items-center justify-end px-6 pt-4 pb-2">
          <button
            onClick={onClose}
            title="Close settings (Esc)"
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted/50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="max-w-2xl">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
