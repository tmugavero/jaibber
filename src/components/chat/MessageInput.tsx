import { useState, useRef, useEffect, lazy, Suspense, KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { AgentInfo } from "@/types/contact";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  agents?: AgentInfo[];
}

/**
 * Extract the @mention query at the cursor position.
 * Returns { query, start } if the cursor is inside an @mention, else null.
 */
function getMentionQuery(text: string, cursorPos: number): { query: string; start: number } | null {
  // Walk backwards from cursor to find the @ trigger
  const before = text.slice(0, cursorPos);
  const atIdx = before.lastIndexOf("@");
  if (atIdx === -1) return null;
  // @ must be at start of input or preceded by whitespace
  if (atIdx > 0 && !/\s/.test(before[atIdx - 1])) return null;
  const query = before.slice(atIdx + 1);
  // No spaces in the query — once user types space, mention is "committed"
  if (/\s/.test(query)) return null;
  return { query, start: atIdx };
}

export function MessageInput({ onSend, disabled, agents = [] }: Props) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);

  // Compute mention state from text + cursor position
  const mentionInfo = getMentionQuery(text, cursorPos);
  const filteredAgents = mentionInfo
    ? agents.filter((a) => a.agentName.toLowerCase().includes(mentionInfo.query.toLowerCase()))
    : [];
  const showMention = mentionInfo !== null && filteredAgents.length > 0;

  // Reset selection index to bottom of list (closest to cursor) when filtered list changes
  useEffect(() => {
    setMentionIndex(filteredAgents.length - 1);
  }, [mentionInfo?.query, filteredAgents.length]);

  const insertMention = (agentName: string) => {
    if (!mentionInfo) return;
    const before = text.slice(0, mentionInfo.start);
    const after = text.slice(cursorPos);
    const newText = `${before}@${agentName} ${after}`;
    setText(newText);
    const newPos = mentionInfo.start + agentName.length + 2; // @Name + space
    setCursorPos(newPos);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.selectionStart = newPos;
        el.selectionEnd = newPos;
        el.focus();
      }
    });
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    setShowEmoji(false);
    setCursorPos(0);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Mention navigation
    if (showMention) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % filteredAgents.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + filteredAgents.length) % filteredAgents.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        insertMention(filteredAgents[mentionIndex].agentName);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        // Move cursor past the @ to dismiss
        setCursorPos(cursorPos + 1);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setCursorPos(e.target.selectionStart);
  };

  const handleSelect = () => {
    const el = textareaRef.current;
    if (el) setCursorPos(el.selectionStart);
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

  // Close mention popup on click outside
  useEffect(() => {
    if (!showMention) return;
    const handler = (e: MouseEvent) => {
      if (mentionRef.current && !mentionRef.current.contains(e.target as Node)) {
        // Dismiss by nudging cursor (will recalculate on next render)
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMention]);

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

      {/* @mention autocomplete */}
      {showMention && (
        <div
          ref={mentionRef}
          className="absolute bottom-full left-14 mb-2 z-10 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[180px]"
        >
          {filteredAgents.map((agent, i) => (
            <button
              key={`${agent.connectionId}-${agent.agentName}`}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent textarea blur
                insertMention(agent.agentName);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors",
                i === mentionIndex
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted/50"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="font-medium">{agent.agentName}</span>
              {agent.machineName && (
                <span className="text-[10px] text-muted-foreground ml-auto">{agent.machineName}</span>
              )}
            </button>
          ))}
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
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onSelect={handleSelect}
        onClick={handleSelect}
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
