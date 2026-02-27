import { useState, useRef, useEffect, useCallback, lazy, Suspense, KeyboardEvent, DragEvent, ClipboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { AgentInfo } from "@/types/contact";
import type { MessageAttachment, PendingAttachment } from "@/types/attachment";
import { validateFile, uploadFile, persistAttachment, formatFileSize, isImageMime } from "@/lib/attachmentApi";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

interface Props {
  onSend: (text: string, attachments?: MessageAttachment[]) => void;
  disabled?: boolean;
  agents?: AgentInfo[];
  projectId: string;
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

let pendingIdCounter = 0;

export function MessageInput({ onSend, disabled, agents = [], projectId }: Props) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Revoke object URLs on cleanup
  useEffect(() => {
    return () => {
      pendingFiles.forEach((pf) => {
        if (isImageMime(pf.mimeType)) {
          URL.revokeObjectURL(URL.createObjectURL(pf.file));
        }
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = useCallback((files: FileList | File[]) => {
    const newPending: PendingAttachment[] = [];
    for (const file of Array.from(files)) {
      const error = validateFile(file);
      if (error) {
        newPending.push({
          id: `pending-${++pendingIdCounter}`,
          file,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          progress: 0,
          status: "error",
          error,
        });
      } else {
        newPending.push({
          id: `pending-${++pendingIdCounter}`,
          file,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          progress: 0,
          status: "uploading",
        });
      }
    }
    setPendingFiles((prev) => [...prev, ...newPending]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

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

  const handleSend = async () => {
    const trimmed = text.trim();
    const hasFiles = pendingFiles.some((f) => f.status !== "error");
    if (!trimmed && !hasFiles) return;
    if (disabled || uploading) return;

    let uploadedAttachments: MessageAttachment[] = [];

    const filesToUpload = pendingFiles.filter((f) => f.status === "uploading");
    if (filesToUpload.length > 0) {
      setUploading(true);
      try {
        const token = useAuthStore.getState().token;
        const apiBaseUrl = useSettingsStore.getState().settings.apiBaseUrl;
        if (!token || !apiBaseUrl) throw new Error("Not authenticated");

        uploadedAttachments = (
          await Promise.all(
            filesToUpload.map(async (pf) => {
              try {
                const result = await uploadFile(
                  apiBaseUrl,
                  token,
                  projectId,
                  pf.file,
                  (progress) => {
                    setPendingFiles((prev) =>
                      prev.map((f) => (f.id === pf.id ? { ...f, progress } : f)),
                    );
                  },
                );

                const attachment = await persistAttachment(apiBaseUrl, token, projectId, {
                  filename: pf.filename,
                  mimeType: pf.mimeType,
                  fileSize: pf.fileSize,
                  blobUrl: result.blobUrl,
                });

                if (!attachment) throw new Error("Failed to persist");

                setPendingFiles((prev) =>
                  prev.map((f) =>
                    f.id === pf.id ? { ...f, status: "uploaded" as const, progress: 100, blobUrl: result.blobUrl } : f,
                  ),
                );

                return {
                  id: attachment.id,
                  filename: attachment.filename,
                  mimeType: attachment.mimeType,
                  fileSize: attachment.fileSize,
                  blobUrl: attachment.blobUrl,
                };
              } catch (err) {
                setPendingFiles((prev) =>
                  prev.map((f) =>
                    f.id === pf.id ? { ...f, status: "error" as const, error: String(err) } : f,
                  ),
                );
                return null;
              }
            }),
          )
        ).filter((a): a is MessageAttachment => a !== null);

        if (uploadedAttachments.length === 0 && filesToUpload.length > 0) {
          setUploading(false);
          return; // all uploads failed
        }
      } catch {
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const messageText = trimmed || `Shared ${uploadedAttachments.length} file(s)`;
    onSend(messageText, uploadedAttachments.length > 0 ? uploadedAttachments : undefined);
    setText("");
    setPendingFiles([]);
    setCursorPos(0);
    setShowEmoji(false);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = ""; // reset so same file can be selected again
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
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

  const hasPendingFiles = pendingFiles.length > 0;

  return (
    <div
      className={cn(
        "relative flex flex-col border-t border-border bg-background",
        dragOver && "ring-2 ring-primary/50 ring-inset",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary/5 pointer-events-none">
          <span className="text-sm font-medium text-primary">Drop files to attach</span>
        </div>
      )}

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

      {/* File preview strip */}
      {hasPendingFiles && (
        <div className="flex gap-2 px-3 pt-2 overflow-x-auto">
          {pendingFiles.map((pf) => (
            <div key={pf.id} className="relative flex-shrink-0 rounded-lg border border-border bg-muted/30 p-1.5">
              {isImageMime(pf.mimeType) ? (
                <img
                  src={URL.createObjectURL(pf.file)}
                  alt={pf.filename}
                  className="w-16 h-16 object-cover rounded"
                />
              ) : (
                <div className="w-16 h-16 flex flex-col items-center justify-center text-muted-foreground">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                  </svg>
                  <span className="text-[8px] mt-0.5 truncate max-w-[60px]">{pf.filename}</span>
                </div>
              )}
              {/* Progress bar */}
              {pf.status === "uploading" && pf.progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b">
                  <div
                    className="h-full bg-primary rounded-b transition-all"
                    style={{ width: `${pf.progress}%` }}
                  />
                </div>
              )}
              {/* Error indicator */}
              {pf.status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/20 rounded-lg">
                  <span className="text-[10px] text-destructive font-medium">Error</span>
                </div>
              )}
              {/* Remove button */}
              <button
                onClick={() => removeFile(pf.id)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] hover:bg-destructive/80"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 p-3">
        {/* Attach file button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          type="button"
          disabled={disabled || uploading}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0",
            "text-muted-foreground hover:text-foreground transition-colors",
            "hover:bg-muted/50",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
          title="Attach file"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

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
          onPaste={handlePaste}
          disabled={disabled || uploading}
          placeholder={uploading ? "Uploading files..." : "Type a message..."}
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-xl border border-input bg-muted/40 px-3.5 py-2.5",
            "text-sm text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-1 focus:ring-primary/50",
            "transition-colors min-h-[42px] max-h-40 leading-relaxed",
            (disabled || uploading) && "opacity-50 cursor-not-allowed"
          )}
        />
        <button
          onClick={handleSend}
          disabled={(!text.trim() && !hasPendingFiles) || disabled || uploading}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90 active:scale-95 transition-all",
            "disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100",
            "flex-shrink-0"
          )}
        >
          {uploading ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
              <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
