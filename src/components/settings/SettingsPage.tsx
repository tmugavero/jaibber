import { useState } from "react";
import { storage, saveSettings } from "@/lib/platform";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { useOrgStore } from "@/stores/orgStore";
import type { AppSettings } from "@/types/settings";

export function SettingsPage() {
  const settings = useSettingsStore((s) => s.settings);
  const username = useAuthStore((s) => s.username);
  const token = useAuthStore((s) => s.token);
  const activeOrg = useOrgStore((s) => s.orgs.find((o) => o.id === s.activeOrgId));
  const [form, setForm] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(form);
      await storage.set("schema_version", 2);
      useSettingsStore.getState().setSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    useAuthStore.getState().clearAuth();
    window.location.reload();
  };

  const handleCreateOrg = async () => {
    const trimmed = orgName.trim();
    if (!trimmed) { setOrgError("Name is required."); return; }
    if (!settings.apiBaseUrl || !token) { setOrgError("Not authenticated."); return; }
    setCreatingOrg(true);
    setOrgError(null);
    try {
      await useOrgStore.getState().createOrg(settings.apiBaseUrl, token, trimmed);
      setOrgName("");
    } catch (e) {
      setOrgError(e instanceof Error ? e.message : "Failed to create organization.");
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!activeOrg || !settings.apiBaseUrl || !token) return;
    setGeneratingInvite(true);
    setInviteError(null);
    setInviteLink(null);
    try {
      const res = await fetch(`${settings.apiBaseUrl}/api/orgs/${activeOrg.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error ?? "Failed to generate invite."); return; }
      // Build the URL from the web app domain (or fallback to server-provided)
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
      // Fallback
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

  const handleChangePassword = async () => {
    if (!newPw || !currentPw) { setPwError("Both fields are required."); return; }
    if (newPw !== confirmPw) { setPwError("New passwords don't match."); return; }
    if (newPw.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    if (!settings.apiBaseUrl || !token) { setPwError("Not authenticated."); return; }
    setChangingPw(true);
    setPwError(null);
    setPwSuccess(false);
    try {
      const res = await fetch(`${settings.apiBaseUrl}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error ?? "Failed to change password."); return; }
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (e) {
      setPwError(`Network error: ${e}`);
    } finally {
      setChangingPw(false);
    }
  };

  const isOrgAdmin = activeOrg && (activeOrg.role === "owner" || activeOrg.role === "admin");

  return (
    <div className="p-6 max-w-lg space-y-6">
      <h1 className="text-xl font-semibold text-foreground">Settings</h1>

      {/* Account info */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-medium text-foreground">Account</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">{username}</div>
            <div className="text-xs text-muted-foreground">Signed in</div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs text-destructive hover:text-destructive/80 transition-colors border border-destructive/30 rounded-lg px-3 py-1.5"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Organization */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-foreground">Organization</h2>

        {activeOrg ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">{activeOrg.name}</div>
                <div className="text-xs text-muted-foreground">
                  Plan: <span className="text-primary font-medium capitalize">{activeOrg.plan}</span>
                  {" · "}Role: <span className="font-medium capitalize">{activeOrg.role}</span>
                </div>
              </div>
            </div>

            {/* Invite link generation — admin/owner only */}
            {isOrgAdmin && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="text-xs font-medium text-muted-foreground">Invite teammates</div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                      className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button
                    onClick={handleGenerateInvite}
                    disabled={generatingInvite}
                    className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {generatingInvite ? "Generating…" : "Generate Link"}
                  </button>
                </div>
                {inviteLink && (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 bg-muted/40 border border-input rounded-lg px-3 py-2 text-xs font-mono text-foreground truncate"
                    />
                    <button
                      onClick={handleCopyInvite}
                      className="text-xs text-primary hover:text-primary/80 transition-colors border border-primary/30 rounded-lg px-3 py-2 flex-shrink-0"
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
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Create an organization to manage your team, billing, and usage analytics.
            </p>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateOrg(); }}
              placeholder="Organization name"
              className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={handleCreateOrg}
              disabled={creatingOrg}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {creatingOrg ? "Creating…" : "Create Organization"}
            </button>
            {orgError && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{orgError}</p>
            )}
          </div>
        )}
      </div>

      {/* Security — change password */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-foreground">Security</h2>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Current password
          </label>
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            New password
          </label>
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Confirm new password
          </label>
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleChangePassword(); }}
            placeholder="••••••••"
            autoComplete="new-password"
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <button
          onClick={handleChangePassword}
          disabled={changingPw}
          className="w-full border border-border rounded-xl py-2.5 text-sm font-semibold hover:bg-muted/40 transition-all disabled:opacity-50"
        >
          {pwSuccess ? "Password Changed!" : changingPw ? "Changing…" : "Change Password"}
        </button>
        {pwError && (
          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{pwError}</p>
        )}
      </div>

      {/* Machine settings */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-medium text-foreground">This Machine</h2>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Machine name <span className="font-normal opacity-60">(cosmetic label)</span>
          </label>
          <input
            type="text"
            value={form.machineName}
            onChange={(e) => setForm({ ...form, machineName: e.target.value })}
            placeholder="e.g. dev-laptop, ubuntu-agent"
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Anthropic API Key <span className="font-normal opacity-60">(optional — needed to run Claude locally)</span>
          </label>
          <input
            type="password"
            value={form.anthropicApiKey ?? ""}
            onChange={(e) => setForm({ ...form, anthropicApiKey: e.target.value || null })}
            placeholder="sk-ant-..."
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Server URL
          </label>
          <input
            type="text"
            value={form.apiBaseUrl}
            onChange={(e) => setForm({ ...form, apiBaseUrl: e.target.value.replace(/\/$/, "") })}
            placeholder="https://jaibber-server.vercel.app"
            className="w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {saved ? "Saved!" : saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
