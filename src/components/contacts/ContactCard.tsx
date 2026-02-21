import { cn } from "@/lib/cn";
import type { Contact } from "@/types/contact";
import { useChatStore } from "@/stores/chatStore";

interface Props {
  contact: Contact;
  isActive: boolean;
  onClick: () => void;
}

export function ContactCard({ contact, isActive, onClick }: Props) {
  // Select the array directly — never use `?? []` inline (creates new ref every render → infinite loop)
  const messages = useChatStore((s) => s.messages[contact.id]);
  const lastMsg = messages?.[messages.length - 1];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left",
        "transition-colors duration-100",
        isActive
          ? "bg-primary/15 text-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
            isActive ? "bg-primary/30 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          {contact.id.charAt(0).toUpperCase()}
        </div>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-sidebar",
            contact.isOnline ? "bg-emerald-400" : "bg-muted-foreground/30"
          )}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold truncate text-foreground">
            {contact.name}
          </span>
          {lastMsg && (
            <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">
              {new Date(lastMsg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {lastMsg
            ? lastMsg.text.slice(0, 50) || (lastMsg.status === "streaming" ? "typing…" : "")
            : contact.isOnline
            ? "online"
            : "offline"}
        </div>
      </div>
    </button>
  );
}
