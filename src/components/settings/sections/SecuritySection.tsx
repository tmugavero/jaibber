import { useState, useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";

export function SecuritySection() {
  const token = useAuthStore((s) => s.token);
  const { apiBaseUrl } = useSettingsStore((s) => s.settings);

  // Email
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Load current email on mount
  useEffect(() => {
    if (!apiBaseUrl || !token) return;
    fetch(`${apiBaseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.email) setEmail(data.email); })
      .catch(() => {})
      .finally(() => setEmailLoading(false));
  }, [apiBaseUrl, token]);

  const handleUpdateEmail = async () => {
    if (!email.trim()) { setEmailError("Email is required."); return; }
    if (!apiBaseUrl || !token) { setEmailError("Not authenticated."); return; }
    setEmailSaving(true);
    setEmailError(null);
    setEmailSuccess(false);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/update-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setEmailError(data.error ?? "Failed to update email."); return; }
      setEmail(data.email);
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 3000);
    } catch (e) {
      setEmailError(`Network error: ${e}`);
    } finally {
      setEmailSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPw || !currentPw) { setPwError("Both fields are required."); return; }
    if (newPw !== confirmPw) { setPwError("New passwords don't match."); return; }
    if (newPw.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    if (!apiBaseUrl || !token) { setPwError("Not authenticated."); return; }
    setChangingPw(true);
    setPwError(null);
    setPwSuccess(false);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/change-password`, {
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

  const inputClass = "w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Email</h2>
        <p className="text-sm text-muted-foreground mb-4">Used for password recovery and notifications.</p>
        <div className="space-y-4 max-w-sm">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={emailLoading ? "" : email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={emailLoading ? "Loading..." : "you@example.com"}
              disabled={emailLoading}
              autoComplete="email"
              onKeyDown={(e) => { if (e.key === "Enter") handleUpdateEmail(); }}
              className={inputClass}
            />
          </div>
          <button
            onClick={handleUpdateEmail}
            disabled={emailSaving || emailLoading}
            className="border border-border rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted/40 transition-all disabled:opacity-50"
          >
            {emailSuccess ? "Email Updated!" : emailSaving ? "Saving..." : "Update Email"}
          </button>
          {emailError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{emailError}</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Password</h2>
        <p className="text-sm text-muted-foreground mb-4">Change your account password.</p>
        <div className="space-y-4 max-w-sm">
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
              className={inputClass}
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
              className={inputClass}
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
              className={inputClass}
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={changingPw}
            className="border border-border rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted/40 transition-all disabled:opacity-50"
          >
            {pwSuccess ? "Password Changed!" : changingPw ? "Changing..." : "Change Password"}
          </button>
          {pwError && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{pwError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
