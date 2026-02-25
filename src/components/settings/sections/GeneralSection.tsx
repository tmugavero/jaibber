import { useAuthStore } from "@/stores/authStore";
import { storage } from "@/lib/platform";

export function GeneralSection() {
  const username = useAuthStore((s) => s.username);

  const handleSignOut = async () => {
    await storage.delete("auth");
    useAuthStore.getState().clearAuth();
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Profile</h2>
        <div className="border-b border-border pb-6">
          <div className="flex items-center gap-4 mt-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
              {(username ?? "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-base font-medium text-foreground">{username}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Signed in</div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-border pb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Account</h2>
        <button
          onClick={handleSignOut}
          className="text-sm text-destructive hover:text-destructive/80 transition-colors border border-destructive/30 rounded-lg px-4 py-2"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
