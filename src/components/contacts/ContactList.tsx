import { useContactStore } from "@/stores/contactStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { ContactCard } from "./ContactCard";

interface Props {
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function ContactList({ activeId, onSelect }: Props) {
  const contactMap = useContactStore((s) => s.contacts);
  const contacts = Object.values(contactMap);
  const myHandle = useSettingsStore((s) => s.settings.myHandle);
  const myMode = useSettingsStore((s) => s.settings.myMode);

  const online = contacts.filter((c) => c.isOnline);
  const offline = contacts.filter((c) => !c.isOnline);

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-border">
      {/* Sidebar header */}
      <div className="px-4 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg font-bold text-foreground tracking-tight">⚡ Jaibber</span>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              myMode === "hub" ? "bg-primary" : "bg-amber-400"
            }`}
          />
          <span className="truncate">{myHandle}</span>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {myMode}
          </span>
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {contacts.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs text-muted-foreground leading-relaxed">
            <div className="text-2xl mb-2">👥</div>
            <div>No agents online yet</div>
            <div className="mt-1 opacity-60">Open Jaibber on another machine to connect</div>
          </div>
        ) : (
          <>
            {online.length > 0 && (
              <>
                <div className="px-2 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Online — {online.length}
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
    </div>
  );
}
