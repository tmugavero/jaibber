import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { storage } from "@/lib/platform";
import { LoginScreen } from "@/components/auth/LoginScreen";

interface InviteInfo {
  orgName: string;
  role: string;
  expired: boolean;
  exhausted: boolean;
}

export function InvitePage() {
  const { token: inviteToken } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const authToken = useAuthStore((s) => s.token);
  const { apiBaseUrl } = useSettingsStore((s) => s.settings);

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const baseUrl = apiBaseUrl || "https://jaibber-server.vercel.app";

  // Check auth state and fetch invite details
  useEffect(() => {
    (async () => {
      const auth = await storage.get<{ token: string }>("auth");
      if (!auth?.token) setNeedsLogin(true);

      try {
        const res = await fetch(`${baseUrl}/api/invites/${inviteToken}`);
        if (!res.ok) {
          setError("Invalid or expired invite link.");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setInvite(data);
      } catch {
        setError("Could not load invite. Check your connection.");
      } finally {
        setLoading(false);
      }
    })();
  }, [inviteToken, baseUrl]);

  const handleAccept = async () => {
    const auth = useAuthStore.getState();
    if (!auth.token) {
      setNeedsLogin(true);
      return;
    }
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/invites/${inviteToken}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to accept invite.");
        return;
      }
      setAccepted(true);
      setTimeout(() => navigate("/app", { replace: true }), 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  const handleLoginComplete = () => {
    setNeedsLogin(false);
    // Re-check — after login, user can accept
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">Loading invite…</div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="text-4xl">&#x274C;</div>
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Go to homepage
          </button>
        </div>
      </div>
    );
  }

  if (needsLogin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto pt-8 px-6">
          {invite && (
            <div className="bg-card border border-border rounded-xl p-4 mb-6 text-center">
              <p className="text-sm text-muted-foreground">You've been invited to join</p>
              <p className="text-lg font-semibold text-foreground mt-1">{invite.orgName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                as <span className="text-primary font-medium">{invite.role}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-3">Sign in or create an account to continue.</p>
            </div>
          )}
        </div>
        <LoginScreen onLogin={handleLoginComplete} />
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="text-4xl">&#x2705;</div>
          <p className="text-lg font-semibold text-foreground">
            Welcome to {invite?.orgName}!
          </p>
          <p className="text-sm text-muted-foreground">Redirecting to the app…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="text-5xl">&#x26A1;</div>
        <div>
          <p className="text-sm text-muted-foreground">You've been invited to join</p>
          <p className="text-2xl font-bold text-foreground mt-2">{invite?.orgName}</p>
          <p className="text-sm text-muted-foreground mt-1">
            as <span className="text-primary font-medium">{invite?.role}</span>
          </p>
        </div>

        {invite?.expired && (
          <p className="text-sm text-destructive">This invite has expired.</p>
        )}
        {invite?.exhausted && (
          <p className="text-sm text-destructive">This invite has reached its usage limit.</p>
        )}

        {!invite?.expired && !invite?.exhausted && (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-base font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {accepting ? "Joining…" : "Join Organization"}
          </button>
        )}

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={() => navigate("/")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Go to homepage
        </button>
      </div>
    </div>
  );
}
