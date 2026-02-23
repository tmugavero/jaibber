import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useContactStore } from "@/stores/contactStore";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { sendMessage } from "@/hooks/useAbly";

interface Props {
  contactId: string;
  onBack?: () => void;
}

export function ChatWindow({ contactId, onBack }: Props) {
  // Never use `?? []` inline in selector — creates new array ref every render → infinite loop
  const messages = useChatStore((s) => s.messages[contactId]);
  const contact = useContactStore((s) => s.contacts[contactId]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const msgCount = messages?.length ?? 0;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgCount]);

  const handleSend = (text: string) => {
    sendMessage(contactId, text);
  };

  const hasStreamingFromThem = messages?.some(
    (m) => m.sender === "them" && m.status === "streaming"
  ) ?? false;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-card/50">
        {onBack && (
          <button
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.38508 7.84188C4.20477 7.64955 4.20477 7.35027 4.38508 7.15794L8.13508 3.15794C8.32394 2.95648 8.64036 2.94628 8.84182 3.13514Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
            </svg>
          </button>
        )}
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
            {(contact?.name ?? contactId).charAt(0).toUpperCase()}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
              contact?.isOnline ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/30"
            }`}
          />
        </div>
        <div>
          <div className="font-semibold text-sm text-foreground">{contact?.name ?? contactId}</div>
          <div className="text-xs text-muted-foreground">
            {contact?.isOnline ? "online" : contact?.lastSeen ? `last seen ${new Date(contact.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "offline"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {msgCount === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Send a message to start the conversation
          </div>
        )}
        {messages?.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSend} disabled={hasStreamingFromThem} />
    </div>
  );
}
