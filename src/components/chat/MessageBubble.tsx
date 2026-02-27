import { cn } from "@/lib/cn";
import type { Message } from "@/types/message";
import type { MessageAttachment } from "@/types/attachment";
import { formatFileSize, isImageMime } from "@/lib/attachmentApi";
import { TypingIndicator } from "./TypingIndicator";

interface Props {
  message: Message;
  onCreateTask?: (message: Message) => void;
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

function renderAttachments(attachments: MessageAttachment[] | undefined, isMe: boolean) {
  if (!attachments?.length) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {attachments.map((att) =>
        isImageMime(att.mimeType) ? (
          <a
            key={att.id}
            href={att.blobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <img
              src={att.blobUrl}
              alt={att.filename}
              className="max-w-[300px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
              loading="lazy"
            />
          </a>
        ) : (
          <a
            key={att.id}
            href={att.blobUrl}
            download={att.filename}
            className={cn(
              "flex items-center gap-2 rounded-lg p-2 transition-colors",
              isMe
                ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                : "bg-muted/50 hover:bg-muted/80",
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{att.filename}</div>
              <div className={cn(
                "text-[10px]",
                isMe ? "text-primary-foreground/60" : "text-muted-foreground",
              )}>
                {formatFileSize(att.fileSize)}
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0 opacity-60">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </a>
        ),
      )}
    </div>
  );
}

export function MessageBubble({ message, onCreateTask }: Props) {
  const isMe = message.sender === "me";
  const isStreaming = message.status === "streaming";
  const isDone = message.status === "done";

  return (
    <div className={cn("flex mb-1 group", isMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed relative",
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
            {renderAttachments(message.attachments, isMe)}
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
          {onCreateTask && isDone && message.text && (
            <button
              onClick={(e) => { e.stopPropagation(); onCreateTask(message); }}
              className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
              title="Create task from message"
            >
              <svg width="10" height="10" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.94993 2.95002L3.94993 4.49998C3.94993 4.74851 3.74846 4.94998 3.49993 4.94998C3.2514 4.94998 3.04993 4.74851 3.04993 4.49998V2.50004C3.04993 2.45246 3.05731 2.40661 3.07099 2.36357C3.12878 2.18175 3.29897 2.05002 3.49993 2.05002H11.4999C11.6553 2.05002 11.7922 2.12872 11.8731 2.24842C11.9216 2.32024 11.9499 2.40683 11.9499 2.50002L11.9499 4.49998C11.9499 4.74851 11.7485 4.94998 11.4999 4.94998C11.2514 4.94998 11.0499 4.74851 11.0499 4.49998V2.95002H3.94993ZM7.49993 5.52487C7.63261 5.52487 7.75991 5.57753 7.85364 5.67126L10.3536 8.17124C10.5489 8.3665 10.5489 8.68308 10.3536 8.87834C10.1584 9.07361 9.84178 9.07361 9.64652 8.87834L7.94993 7.18177V12.5C7.94993 12.7485 7.74846 12.95 7.49993 12.95C7.2514 12.95 7.04993 12.7485 7.04993 12.5V7.18177L5.35334 8.87834C5.15808 9.07361 4.84149 9.07361 4.64623 8.87834C4.45097 8.68308 4.45097 8.3665 4.64623 8.17124L7.14623 5.67126C7.23995 5.57753 7.36726 5.52487 7.49993 5.52487Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
