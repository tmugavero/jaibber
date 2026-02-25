import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useContactStore } from "@/stores/contactStore";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { sendMessage } from "@/hooks/useAbly";
import { getAbly } from "@/lib/ably";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ExecutionMode } from "@/types/message";

interface ProjectMember {
  userId: string;
  username: string;
  role: string;
}

interface Props {
  contactId: string;
  onBack?: () => void;
}

export function ChatWindow({ contactId, onBack }: Props) {
  // Never use `?? []` inline in selector — creates new array ref every render → infinite loop
  const messages = useChatStore((s) => s.messages[contactId]);
  const contact = useContactStore((s) => s.contacts[contactId]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showInfo, setShowInfo] = useState(false);

  // Project members state
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberMsg, setAddMemberMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("auto");

  const msgCount = messages?.length ?? 0;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgCount]);

  // Load project members when info panel opens
  useEffect(() => {
    if (showInfo) loadProjectMembers();
  }, [showInfo, contactId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProjectMembers = async () => {
    const { token } = useAuthStore.getState();
    const { apiBaseUrl } = useSettingsStore.getState().settings;
    if (!token || !apiBaseUrl) return;
    setLoadingMembers(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${contactId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjectMembers(data.members ?? []);
      }
    } catch { /* ignore */ } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = async () => {
    const trimmed = addUsername.trim();
    if (!trimmed) return;
    const { token } = useAuthStore.getState();
    const { apiBaseUrl } = useSettingsStore.getState().settings;
    if (!token || !apiBaseUrl) return;
    setAddingMember(true);
    setAddMemberMsg(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${contactId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddMemberMsg({ type: "error", text: data.error ?? "Failed to add member." });
        return;
      }
      setAddMemberMsg({ type: "success", text: `Added ${data.member.username}` });
      setAddUsername("");
      await loadProjectMembers();
      // Notify all clients to refresh their project list (new member needs to see this project)
      const ably = getAbly();
      if (ably) {
        ably.channels.get("jaibber:presence").publish("refresh-projects", {});
      }
      setTimeout(() => setAddMemberMsg(null), 3000);
    } catch (e) {
      setAddMemberMsg({ type: "error", text: `Network error: ${e}` });
    } finally {
      setAddingMember(false);
    }
  };

  const handleSend = (text: string) => {
    sendMessage(contactId, text, executionMode);
  };

  const hasStreamingFromThem = messages?.some(
    (m) => m.sender === "them" && m.status === "streaming"
  ) ?? false;

  const agents = contact?.onlineAgents ?? [];
  const isAdmin = contact?.role === "admin";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="flex items-center gap-3 px-5 py-3.5">
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
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-foreground">{contact?.name ?? contactId}</div>
            <div className="text-xs text-muted-foreground">
              {contact?.isOnline
                ? agents.length > 0
                  ? `${agents.length} agent${agents.length > 1 ? "s" : ""} online`
                  : "online"
                : contact?.lastSeen
                  ? `last seen ${new Date(contact.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "offline"}
            </div>
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`text-xs transition-colors px-2 py-1 rounded ${
              showInfo ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Project info"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.49991 0.877045C3.84222 0.877045 0.877075 3.84219 0.877075 7.49988C0.877075 11.1576 3.84222 14.1227 7.49991 14.1227C11.1576 14.1227 14.1227 11.1576 14.1227 7.49988C14.1227 3.84219 11.1576 0.877045 7.49991 0.877045ZM1.82708 7.49988C1.82708 4.36686 4.3669 1.82704 7.49991 1.82704C10.6329 1.82704 13.1727 4.36686 13.1727 7.49988C13.1727 10.6329 10.6329 13.1727 7.49991 13.1727C4.3669 13.1727 1.82708 10.6329 1.82708 7.49988ZM8.24993 10.5C8.24993 10.9142 7.91414 11.25 7.49993 11.25C7.08571 11.25 6.74993 10.9142 6.74993 10.5C6.74993 10.0858 7.08571 9.75 7.49993 9.75C7.91414 9.75 8.24993 10.0858 8.24993 10.5ZM6.05003 6.25C6.05003 5.57211 6.63511 4.925 7.50003 4.925C8.36496 4.925 8.95003 5.57211 8.95003 6.25C8.95003 6.74118 8.68002 6.99212 8.21447 7.27494C8.16251 7.30651 8.10258 7.34131 8.03847 7.37854C7.70211 7.57392 7.24993 7.83568 7.24993 8.5C7.24993 8.77614 7.47379 9 7.74993 9C8.02607 9 8.24993 8.77614 8.24993 8.5C8.24993 8.34993 8.36893 8.26058 8.69277 8.07185C8.7566 8.03418 8.82743 7.99268 8.90494 7.94534C9.38037 7.65625 9.95003 7.22944 9.95003 6.25C9.95003 4.92789 8.71509 3.925 7.50003 3.925C6.28497 3.925 5.05003 4.92789 5.05003 6.25C5.05003 6.52614 5.27389 6.75 5.55003 6.75C5.82617 6.75 6.05003 6.52614 6.05003 6.25Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
            </svg>
          </button>
          {msgCount > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded"
              title="Clear chat history"
            >
              Clear
            </button>
          )}
        </div>

        {/* Collapsible project info panel */}
        {showInfo && (
          <div className="px-5 pb-3.5 space-y-3 border-t border-border/50 pt-3">
            {contact?.description && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Description</div>
                <div className="text-xs text-foreground">{contact.description}</div>
              </div>
            )}

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                Agents ({agents.length} online)
              </div>
              {agents.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  No agents online. Register this project on a desktop machine to run an agent.
                </div>
              ) : (
                <div className="space-y-2">
                  {agents.map((agent) => (
                    <div
                      key={agent.connectionId}
                      className="bg-muted/30 rounded-lg p-2.5 border border-border/50 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                        <span className="text-xs font-medium text-foreground">
                          {agent.agentName}
                        </span>
                        {agent.machineName && (
                          <span className="text-xs text-muted-foreground">
                            on {agent.machineName}
                          </span>
                        )}
                      </div>
                      {agent.agentInstructions && (
                        <div className="text-xs text-muted-foreground ml-4 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                          {agent.agentInstructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Project members */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                Members {!loadingMembers && projectMembers.length > 0 && `(${projectMembers.length})`}
              </div>
              {loadingMembers ? (
                <div className="text-xs text-muted-foreground animate-pulse">Loading...</div>
              ) : projectMembers.length > 0 ? (
                <div className="space-y-1">
                  {projectMembers.map((m) => {
                    const isMemberCreator = contact?.ownerId != null && m.userId === contact.ownerId;
                    const memberLabel = isMemberCreator ? "creator" : m.role;
                    return (
                      <div key={m.userId} className="flex items-center gap-1.5 text-xs">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-semibold text-primary flex-shrink-0">
                          {m.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-foreground font-medium">{m.username}</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded-full ${
                          isMemberCreator
                            ? "bg-emerald-500/10 text-emerald-600"
                            : m.role === "admin"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}>
                          {memberLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">No members loaded.</div>
              )}

              {/* Add member form — admin only */}
              {isAdmin && (
                <div className="mt-2">
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      value={addUsername}
                      onChange={(e) => setAddUsername(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddMember(); }}
                      placeholder="Add by username..."
                      className="flex-1 bg-muted/40 border border-input rounded-md px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button
                      onClick={handleAddMember}
                      disabled={addingMember || !addUsername.trim()}
                      className="bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-xs font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                      {addingMember ? "..." : "Add"}
                    </button>
                  </div>
                  {addMemberMsg && (
                    <p className={`text-[10px] mt-1 ${
                      addMemberMsg.type === "success" ? "text-emerald-500" : "text-destructive"
                    }`}>
                      {addMemberMsg.text}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Tip:</span> Use <span className="font-mono text-primary/80">@AgentName</span> to direct a message to a specific agent.
            </div>
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
      {contact?.role === "org-admin" ? (
        <div className="px-4 py-3 border-t border-border text-center text-xs text-muted-foreground">
          You are viewing this project as an org admin. Join the project to participate.
        </div>
      ) : (
        <>
          <MessageInput onSend={handleSend} disabled={hasStreamingFromThem} />
          {/* Plan / Auto mode toggle — below input, like Claude Code */}
          <div className="flex items-center pb-2 pt-0" style={{ paddingLeft: "3.75rem" }}>
            <div className="flex bg-muted/40 rounded-lg p-0.5 text-[11px]">
              <button
                onClick={() => setExecutionMode("plan")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  executionMode === "plan"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Plan
              </button>
              <button
                onClick={() => setExecutionMode("auto")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  executionMode === "auto"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Auto
              </button>
            </div>
          </div>
        </>
      )}
      <ConfirmDialog
        open={showClearConfirm}
        onConfirm={() => {
          useChatStore.getState().clearConversation(contactId);
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
        title="Clear chat history"
        description="Clear chat history for this project?"
      />
    </div>
  );
}
