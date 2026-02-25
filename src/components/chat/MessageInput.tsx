import { useState, useRef, useEffect, lazy, Suspense, KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    setShowEmoji(false);
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

  const handleEmojiSelect = (emojiData: { emoji: string }) => {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const before = text.slice(0, start);
      const after = text.slice(end);
      const newText = before + emojiData.emoji + after;
      setText(newText);
      requestAnimationFrame(() => {
        const pos = start + emojiData.emoji.length;
        el.selectionStart = pos;
        el.selectionEnd = pos;
        el.focus();
      });
    } else {
      setText(text + emojiData.emoji);
    }
    setShowEmoji(false);
  };

  // Close emoji picker on click outside
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => {
      if (
        emojiRef.current && !emojiRef.current.contains(e.target as Node) &&
        emojiButtonRef.current && !emojiButtonRef.current.contains(e.target as Node)
      ) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmoji]);

  return (
    <div className="relative flex items-end gap-2 p-3 border-t border-border bg-background">
      {/* Emoji picker */}
      {showEmoji && (
        <div
          ref={emojiRef}
          className="absolute bottom-full left-3 mb-2 z-10"
        >
          <Suspense fallback={
            <div className="w-[350px] h-[400px] bg-card border border-border rounded-xl flex items-center justify-center text-sm text-muted-foreground">
              Loading...
            </div>
          }>
            <EmojiPicker
              onEmojiClick={handleEmojiSelect}
              width={350}
              height={400}
              theme={"dark" as any}
              searchPlaceholder="Search emoji..."
              lazyLoadEmojis
            />
          </Suspense>
        </div>
      )}

      {/* Emoji button */}
      <button
        ref={emojiButtonRef}
        onClick={() => setShowEmoji(!showEmoji)}
        type="button"
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0",
          "text-muted-foreground hover:text-foreground transition-colors",
          "hover:bg-muted/50",
          showEmoji && "text-primary bg-muted/50"
        )}
        title="Emoji"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </button>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={disabled}
        placeholder="Type a message..."
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
