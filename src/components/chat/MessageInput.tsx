import { useState, useRef, KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-border bg-background">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={disabled}
        placeholder="Type a message…"
        rows={1}
        className={cn(
          "flex-1 resize-none rounded-xl border border-input bg-muted/40 px-3.5 py-2.5",
          "text-sm text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-1 focus:ring-primary/50",
          "transition-colors min-h-[42px] max-h-40 leading-relaxed",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl",
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90 active:scale-95 transition-all",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100",
          "flex-shrink-0"
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
}
