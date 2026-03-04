import { useState, useEffect, useRef } from "react";
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
  { id: "api-keys", label: "API Keys" },
  { id: "billing", label: "Billing" },
  { id: "analytics", label: "Analytics" },
];

const VALID_SECTIONS: Set<string> = new Set(NAV_ITEMS.map((i) => i.id));

interface Props {
  onClose: () => void;
  initialSection?: string | null;
  onSectionChange?: (section: Section) => void;
}

function OrgSwitcher({ className }: { className?: string }) {
  const orgs = useOrgStore((s) => s.orgs);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeOrg = orgs.find((o) => o.id === activeOrgId);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (orgs.length === 0) return null;

  // Single org — just show it, no dropdown
  if (orgs.length === 1) {
    return (
      <div className={cn("px-3 py-2", className)}>
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Managing</div>
        <div className="text-sm font-medium text-foreground truncate">{activeOrg?.name ?? "—"}</div>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 text-left hover:bg-muted/30 rounded-md transition-colors"
      >
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Managing</div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground truncate">{activeOrg?.name ?? "—"}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground flex-shrink-0">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="absolute left-2 right-2 top-full mt-1 bg-popover border border-border rounded-md shadow-lg z-50 py-1">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => { setActiveOrg(org.id); setOpen(false); }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center justify-between",
                org.id === activeOrgId
                  ? "bg-muted/50 text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <span className="truncate">{org.name}</span>
              <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">{org.role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsPane({ onClose, initialSection, onSectionChange }: Props) {
  const startSection: Section = (initialSection && VALID_SECTIONS.has(initialSection) ? initialSection : "general") as Section;
  const [activeSection, setActiveSection] = useState<Section>(startSection);
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
    onSectionChange?.(section);
    if (isMobile) setMobileShowContent(true);
  };

  const handleMobileBack = () => {
    setMobileShowContent(false);
  };

  const renderContent = () => {
    const adminSections: Section[] = ["api-keys", "billing", "analytics"];
    if (adminSections.includes(activeSection) && !canAccessAdmin) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              {activeOrg ? "Admin access required" : "Create an organization"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {activeOrg
                ? "You need to be an admin or owner of your organization to access this section."
                : "Create or join an organization to access API Keys, Billing, and Analytics."
              }
            </p>
          </div>
          {!activeOrg && (
            <button
              onClick={() => { setActiveSection("organization"); onSectionChange?.("organization"); }}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-all"
            >
              Go to Organization
            </button>
          )}
        </div>
      );
    }

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
        <OrgSwitcher className="mx-2 mt-1" />
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
        <OrgSwitcher className="mx-2 mb-2" />
        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
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
          <div className={activeSection === "analytics" ? "" : "max-w-2xl"}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
