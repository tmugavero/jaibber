import { cn } from "@/lib/cn";
import type { Message } from "@/types/message";
import { TypingIndicator } from "./TypingIndicator";

interface Props {
  message: Message;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderText(text: string) {
  // Simple code block detection
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const code = part.replace(/^```[^\n]*\n?/, "").replace(/```$/, "");
      return (
        <pre
          key={i}
          className="bg-black/30 rounded-md p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap mt-2 mb-1"
        >
          {code}
        </pre>
      );
    }
    return <span key={i} className="whitespace-pre-wrap">{part}</span>;
  });
}

export function MessageBubble({ message }: Props) {
  const isMe = message.sender === "me";
  const isStreaming = message.status === "streaming";

  return (
    <div className={cn("flex mb-1", isMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isMe
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-card border border-border text-card-foreground rounded-bl-sm"
        )}
      >
        {isStreaming && !message.text ? (
          <TypingIndicator />
        ) : (
          <>
            {renderText(message.text)}
            {isStreaming && <TypingIndicator inline />}
          </>
        )}
        <div
          className={cn(
            "text-[10px] mt-1 select-none",
            isMe ? "text-primary-foreground/60 text-right" : "text-muted-foreground"
          )}
        >
          {!isMe && message.senderName && (
            <span className="font-medium mr-1">{message.senderName}</span>
          )}
          {message.executionMode === "plan" && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-600 font-medium mr-1">
              PLAN
            </span>
          )}
          {formatTime(message.timestamp)}
          {isMe && (
            <span className="ml-1">
              {message.status === "sending" ? "·" : message.status === "error" ? "✗" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
