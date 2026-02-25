import { useState, useEffect } from "react";
import { useOrgStore } from "@/stores/orgStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";

interface OrgInvite {
  id: string;
  token: string;
  role: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
}

export function OrganizationSection() {
  const token = useAuthStore((s) => s.token);
  const { apiBaseUrl } = useSettingsStore((s) => s.settings);
  const activeOrg = useOrgStore((s) => s.orgs.find((o) => o.id === s.activeOrgId));
  const isOrgAdmin = activeOrg && (activeOrg.role === "owner" || activeOrg.role === "admin");

  // Org creation
  const [orgName, setOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  // Add member by username
  const [inviteUsername, setInviteUsername] = useState("");
  const [memberRole, setMemberRole] = useState<"member" | "admin">("member");
  const [addingMember, setAddingMember] = useState(false);
  const [memberSuccess, setMemberSuccess] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Invite links
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteExpiry, setInviteExpiry] = useState<string>("none");
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Load invites when org is active
  useEffect(() => {
    if (activeOrg && isOrgAdmin) loadInvites();
  }, [activeOrg?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadInvites = async () => {
    if (!activeOrg || !apiBaseUrl || !token) return;
    setLoadingInvites(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/orgs/${activeOrg.id}/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites ?? []);
      }
    } catch { /* ignore */ } finally {
      setLoadingInvites(false);
    }
  };

  const handleCreateOrg = async () => {
    const trimmed = orgName.trim();
    if (!trimmed) { setOrgError("Name is required."); return; }
    if (!apiBaseUrl || !token) { setOrgError("Not authenticated."); return; }
    setCreatingOrg(true);
    setOrgError(null);
    try {
      await useOrgStore.getState().createOrg(apiBaseUrl, token, trimmed);
      setOrgName("");
    } catch (e) {
      setOrgError(e instanceof Error ? e.message : "Failed to create organization.");
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleAddMember = async () => {
    const trimmed = inviteUsername.trim();
    if (!trimmed) { setMemberError("Username is required."); return; }
    if (!activeOrg || !apiBaseUrl || !token) return;
    setAddingMember(true);
    setMemberError(null);
    setMemberSuccess(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/orgs/${activeOrg.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: trimmed, role: memberRole }),
      });
      const data = await res.json();
      if (!res.ok) { setMemberError(data.error ?? "Failed to add member."); return; }
      setMemberSuccess(`Added ${data.member.username} as ${data.member.role}`);
      setInviteUsername("");
      setTimeout(() => setMemberSuccess(null), 3000);
    } catch (e) {
      setMemberError(`Network error: ${e}`);
    } finally {
      setAddingMember(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!activeOrg || !apiBaseUrl || !token) return;
    setGeneratingInvite(true);
    setInviteError(null);
    try {
      const expiresInHours = inviteExpiry === "none" ? undefined
        : inviteExpiry === "24h" ? 24
        : inviteExpiry === "7d" ? 168
        : inviteExpiry === "30d" ? 720
        : undefined;
      const res = await fetch(`${apiBaseUrl}/api/orgs/${activeOrg.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: inviteRole, expiresInHours }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error ?? "Failed to generate invite."); return; }
      await loadInvites();
    } catch (e) {
      setInviteError(`Network error: ${e}`);
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!activeOrg || !apiBaseUrl || !token) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/orgs/${activeOrg.id}/invites/${inviteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      }
    } catch { /* ignore */ }
  };

  const handleCopyInvite = async (invite: OrgInvite) => {
    const url = `${window.location.origin}/invite/${invite.token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopiedInviteId(invite.id);
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

  const inputClass = "w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Organization</h2>
        <p className="text-sm text-muted-foreground mb-4">Manage your team and organization.</p>
      </div>

      {activeOrg ? (
        <div className="space-y-6">
          <div className="border-b border-border pb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-base font-medium text-foreground">{activeOrg.name}</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  Plan: <span className="text-primary font-medium capitalize">{activeOrg.plan}</span>
                  {" · "}Role: <span className="font-medium capitalize">{activeOrg.role}</span>
                </div>
              </div>
            </div>
          </div>

          {isOrgAdmin && (
            <>
              {/* Add member by username */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Add member by username</h3>
                <div className="flex gap-2 items-end max-w-md">
                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1">Username</label>
                    <input
                      type="text"
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddMember(); }}
                      placeholder="username"
                      className={inputClass}
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs text-muted-foreground mb-1">Role</label>
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value as "member" | "admin")}
                      className={inputClass}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button
                    onClick={handleAddMember}
                    disabled={addingMember}
                    className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {addingMember ? "Adding..." : "Add"}
                  </button>
                </div>
                {memberSuccess && (
                  <p className="text-xs text-emerald-500 bg-emerald-500/10 rounded-lg px-3 py-2">{memberSuccess}</p>
                )}
                {memberError && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{memberError}</p>
                )}
              </div>

              {/* Invite links */}
              <div className="space-y-3 border-t border-border pt-6">
                <h3 className="text-sm font-medium text-foreground">Invite links</h3>
                <div className="flex gap-2 items-end max-w-lg flex-wrap">
                  <div className="w-28">
                    <label className="block text-xs text-muted-foreground mb-1">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                      className={inputClass}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="w-36">
                    <label className="block text-xs text-muted-foreground mb-1">Expires</label>
                    <select
                      value={inviteExpiry}
                      onChange={(e) => setInviteExpiry(e.target.value)}
                      className={inputClass}
                    >
                      <option value="none">Never</option>
                      <option value="24h">24 hours</option>
                      <option value="7d">7 days</option>
                      <option value="30d">30 days</option>
                    </select>
                  </div>
                  <button
                    onClick={handleGenerateInvite}
                    disabled={generatingInvite}
                    className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {generatingInvite ? "Generating..." : "Generate Link"}
                  </button>
                </div>

                {inviteError && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{inviteError}</p>
                )}

                {/* Active invites list */}
                {loadingInvites ? (
                  <p className="text-xs text-muted-foreground animate-pulse">Loading invites...</p>
                ) : invites.length > 0 ? (
                  <div className="space-y-2 max-w-lg">
                    <p className="text-xs text-muted-foreground font-medium">Active invite links</p>
                    {invites.map((inv) => {
                      const expired = inv.expiresAt ? new Date(inv.expiresAt) < new Date() : false;
                      const exhausted = inv.maxUses ? inv.useCount >= inv.maxUses : false;
                      const isInvalid = expired || exhausted;
                      return (
                        <div
                          key={inv.id}
                          className={`flex items-center gap-2 text-xs rounded-lg border border-border/50 px-3 py-2 ${isInvalid ? "opacity-50" : ""}`}
                        >
                          <span className="text-muted-foreground capitalize flex-shrink-0">{inv.role}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">
                            {inv.useCount} use{inv.useCount !== 1 ? "s" : ""}
                            {inv.maxUses != null && ` / ${inv.maxUses}`}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground flex-shrink-0">
                            {inv.expiresAt
                              ? expired
                                ? "Expired"
                                : `Expires ${new Date(inv.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                              : "No expiry"}
                          </span>
                          {isInvalid && (
                            <span className="text-destructive/70 flex-shrink-0">
                              {expired ? "(expired)" : "(limit reached)"}
                            </span>
                          )}
                          <div className="flex-1" />
                          <button
                            onClick={() => handleCopyInvite(inv)}
                            className="text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                          >
                            {copiedInviteId === inv.id ? "Copied!" : "Copy"}
                          </button>
                          <button
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="text-destructive hover:text-destructive/80 transition-colors flex-shrink-0"
                          >
                            Revoke
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No active invite links.</p>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4 max-w-sm">
          <p className="text-sm text-muted-foreground">
            Create an organization to manage your team, billing, and usage analytics.
          </p>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateOrg(); }}
            placeholder="Organization name"
            className={inputClass}
          />
          <button
            onClick={handleCreateOrg}
            disabled={creatingOrg}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {creatingOrg ? "Creating..." : "Create Organization"}
          </button>
          {orgError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{orgError}</p>
          )}
        </div>
      )}
    </div>
  );
}
