import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSettingsStore } from "@/stores/settingsStore";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const apiBaseUrl =
    useSettingsStore.getState().settings.apiBaseUrl || "https://api.jaibber.com";

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      setError("Both fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Reset failed.");
        return;
      }
      setSuccess(true);
    } catch (e) {
      setError(`Network error: ${e}`);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-muted/40 border border-input rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50";

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-3">&#x26A1;</div>
          <h1 className="text-xl font-bold text-foreground">Invalid Reset Link</h1>
          <p className="text-sm text-muted-foreground mt-2">
            This link is missing the reset token. Please request a new password
            reset.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-6 text-sm text-primary hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-3">&#x2705;</div>
          <h1 className="text-xl font-bold text-foreground">Password Reset</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Your password has been changed. You can now sign in with your new
            password.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-6 bg-primary text-primary-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:bg-primary/90"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">&#x26A1;</div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Jaibber
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose a new password
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 shadow-xl space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                className={inputClass}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-wait"
            >
              {submitting ? "Resetting..." : "Reset Password"}
            </button>
          </div>
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
