import { useState } from "react";
import { useContactStore } from "@/stores/contactStore";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { ContactCard } from "./ContactCard";
import { isTauri } from "@/lib/platform";

interface Props {
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenSettings: () => void;
}

export function ContactList({ activeId, onSelect, onOpenSettings }: Props) {
  const contactMap = useContactStore((s) => s.contacts);
  const contacts = Object.values(contactMap);
  const username = useAuthStore((s) => s.username);
  const [refreshing, setRefreshing] = useState(false);

  const online = contacts.filter((c) => c.isOnline);
  const offline = contacts.filter((c) => !c.isOnline);

  const handleRefresh = async () => {
    const { token } = useAuthStore.getState();
    const { apiBaseUrl } = useSettingsStore.getState().settings;
    if (!token || !apiBaseUrl) return;
    setRefreshing(true);
    try {
      await useContactStore.getState().loadFromServer(apiBaseUrl, token);
    } catch { /* ignore */ } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-border">
      {/* Sidebar header */}
      <div className="px-4 pt-5 pb-3 border-b border-border flex items-center justify-between">
        <span className="text-lg font-bold text-foreground tracking-tight">Jaibber</span>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh projects"
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50 disabled:opacity-50"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={refreshing ? "animate-spin" : ""}
          >
            <path d="M1.84998 7.49998C1.84998 4.66458 4.05979 1.84998 7.49998 1.84998C10.2783 1.84998 11.6515 3.9064 12.2367 5H10.5C10.2239 5 10 5.22386 10 5.5C10 5.77614 10.2239 6 10.5 6H13.5C13.7761 6 14 5.77614 14 5.5V2.5C14 2.22386 13.7761 2 13.5 2C13.2239 2 13 2.22386 13 2.5V4.31318C12.2955 3.07126 10.6659 0.849976 7.49998 0.849976C3.43716 0.849976 0.849976 4.18537 0.849976 7.49998C0.849976 10.8146 3.43716 14.15 7.49998 14.15C9.44382 14.15 11.0622 13.3808 12.2145 12.2084C12.8315 11.5806 13.3133 10.839 13.6418 10.0407C13.7469 9.78536 13.6251 9.49315 13.3698 9.38806C13.1144 9.28296 12.8222 9.40478 12.7171 9.66014C12.4363 10.3425 12.0251 10.9745 11.5013 11.5074C10.5295 12.4963 9.16504 13.15 7.49998 13.15C4.05979 13.15 1.84998 10.3354 1.84998 7.49998Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
          </svg>
        </button>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {contacts.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs text-muted-foreground leading-relaxed">
            <div className="text-2xl mb-2">📁</div>
            <div>No projects yet</div>
            <div className="mt-1 opacity-60">
              {isTauri
                ? "Open Settings to create your first project"
                : "Open Settings to create a project, or ask a team admin to invite you"}
            </div>
          </div>
        ) : (
          <>
            {online.length > 0 && (
              <>
                <div className="px-2 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Active — {online.length}
                </div>
                {online.map((c) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    isActive={activeId === c.id}
                    onClick={() => onSelect(c.id)}
                  />
                ))}
              </>
            )}
            {offline.length > 0 && (
              <>
                <div className="px-2 pt-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Offline — {offline.length}
                </div>
                {offline.map((c) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    isActive={activeId === c.id}
                    onClick={() => onSelect(c.id)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Bottom user bar */}
      <div className="border-t border-border px-3 py-2.5 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
          {(username ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0 bg-green-500" />
            {username ?? <span className="italic opacity-50">not logged in</span>}
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted/50 min-w-[36px] min-h-[36px] flex items-center justify-center flex-shrink-0"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.07095 0.650238C6.67391 0.650238 6.32977 0.925096 6.24198 1.31231L6.0039 2.36247C5.6249 2.47269 5.26335 2.62363 4.92436 2.81013L4.01335 2.23585C3.67748 2.02413 3.23978 2.07312 2.95903 2.35386L2.35294 2.95996C2.0722 3.2407 2.0232 3.6784 2.23493 4.01427L2.80942 4.92561C2.62307 5.2645 2.47227 5.62594 2.36216 6.00481L1.31209 6.24287C0.924883 6.33065 0.650024 6.6748 0.650024 7.07183V7.92897C0.650024 8.32601 0.924883 8.67015 1.31209 8.75794L2.36228 8.99603C2.47246 9.375 2.62335 9.73652 2.80975 10.0755L2.23553 10.9867C2.0238 11.3225 2.0728 11.7602 2.35355 12.041L2.95964 12.6471C3.24038 12.9278 3.67808 12.9768 4.01395 12.7651L4.92506 12.1907C5.26384 12.377 5.62516 12.5278 6.0039 12.638L6.24198 13.6881C6.32977 14.0753 6.67391 14.3502 7.07095 14.3502H7.92809C8.32512 14.3502 8.66927 14.0753 8.75706 13.6881L8.99509 12.638C9.37391 12.5278 9.73531 12.3769 10.0741 12.1905L10.9854 12.7649C11.3213 12.9766 11.759 12.9276 12.0397 12.6469L12.6458 12.0408C12.9266 11.76 12.9756 11.3223 12.7638 10.9865L12.1893 10.0751C12.3756 9.73625 12.5264 9.37469 12.6364 8.99568L13.6864 8.75761C14.0736 8.66982 14.3485 8.32568 14.3485 7.92864V7.0715C14.3485 6.67446 14.0736 6.33032 13.6864 6.24253L12.6363 6.00435C12.5262 5.62538 12.3753 5.26386 12.1888 4.92506L12.7631 4.01407C12.9748 3.6782 12.9258 3.2405 12.6451 2.95975L12.039 2.35366C11.7583 2.07292 11.3206 2.02392 10.9847 2.23565L10.0736 2.80993C9.73474 2.62357 9.37323 2.47271 8.99438 2.36259L8.75706 1.31231C8.66927 0.925096 8.32512 0.650238 7.92809 0.650238H7.07095Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
            <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" fill="none" strokeWidth="1.5"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
