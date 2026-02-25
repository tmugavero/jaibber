import { useState } from "react";
import { useOrgStore } from "@/stores/orgStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";

export function OrganizationSection() {
  const token = useAuthStore((s) => s.token);
  const { apiBaseUrl } = useSettingsStore((s) => s.settings);
  const activeOrg = useOrgStore((s) => s.orgs.find((o) => o.id === s.activeOrgId));
  const isOrgAdmin = activeOrg && (activeOrg.role === "owner" || activeOrg.role === "admin");

  // Org creation
  const [orgName, setOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  // Invite link
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

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

  const handleGenerateInvite = async () => {
    if (!activeOrg || !apiBaseUrl || !token) return;
    setGeneratingInvite(true);
    setInviteError(null);
    setInviteLink(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/orgs/${activeOrg.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error ?? "Failed to generate invite."); return; }
      const webBaseUrl = window.location.origin;
      setInviteLink(data.invite.url || `${webBaseUrl}/invite/${data.invite.token}`);
    } catch (e) {
      setInviteError(`Network error: ${e}`);
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = inviteLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }
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
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Invite teammates</h3>
              <div className="flex gap-2 items-end max-w-md">
                <div className="flex-1">
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
                <button
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                  className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {generatingInvite ? "Generating..." : "Generate Link"}
                </button>
              </div>
              {inviteLink && (
                <div className="flex gap-2 items-center max-w-md">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className={inputClass + " font-mono text-xs truncate"}
                  />
                  <button
                    onClick={handleCopyInvite}
                    className="text-sm text-primary hover:text-primary/80 transition-colors border border-primary/30 rounded-lg px-3 py-2 flex-shrink-0"
                  >
                    {inviteCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
              {inviteError && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{inviteError}</p>
              )}
            </div>
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
