import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useContactStore } from "@/stores/contactStore";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { sendMessage } from "@/hooks/useAbly";

interface Props {
  contactId: string;
}

export function ChatWindow({ contactId }: Props) {
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
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
            {contactId.charAt(0).toUpperCase()}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
              contact?.isOnline ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/30"
            }`}
          />
        </div>
        <div>
          <div className="font-semibold text-sm text-foreground">{contactId}</div>
          <div className="text-xs text-muted-foreground">
            {contact?.isOnline ? "online" : contact?.lastSeen ? `last seen ${new Date(contact.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "offline"}
          </div>
        </div>
        {contact?.mode === "agent" && (
          <div className="ml-auto">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
              agent
            </span>
          </div>
        )}
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
