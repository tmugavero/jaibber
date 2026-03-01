import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { storage } from "@/lib/platform";
import { cn } from "@/lib/cn";

function useIsLoggedIn() {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    storage.get<{ token: string }>("auth").then((auth) => {
      if (auth?.token) setLoggedIn(true);
    });
  }, []);
  return loggedIn;
}

const NAV_LINKS = [
  { to: "/features", label: "Features" },
  { to: "/use-cases", label: "Use Cases" },
  { to: "/developers", label: "Developers" },
  { to: "/pricing", label: "Pricing" },
];

export function MarketingNav() {
  const location = useLocation();
  const loggedIn = useIsLoggedIn();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-foreground font-bold text-lg tracking-tight">
          <span className="text-xl">&#x26A1;</span>
          Jaibber
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "text-sm transition-colors",
                location.pathname === link.to
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {loggedIn ? (
            <Link
              to="/app"
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-all"
            >
              Open App
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/login"
                className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-all"
              >
                Get Started
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-muted-foreground hover:text-foreground p-1"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-lg">
          <div className="px-6 py-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "block text-sm py-1 transition-colors",
                  location.pathname === link.to
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
            {!loggedIn && (
              <Link
                to="/login"
                className="block text-sm py-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export function MarketingFooter() {
  const loggedIn = useIsLoggedIn();

  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 mb-8">
          <div>
            <Link to="/" className="flex items-center gap-2 text-foreground font-bold tracking-tight mb-2">
              <span className="text-lg">&#x26A1;</span>
              Jaibber
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Where your team meets your AI agents.
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Product</div>
            <div className="space-y-2">
              <Link to="/features" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link>
              <Link to="/use-cases" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Use Cases</Link>
              <Link to="/pricing" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Developers</div>
            <div className="space-y-2">
              <Link to="/developers" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">API & Webhooks</Link>
              <span className="block text-sm text-muted-foreground/50">Agent SDK (soon)</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Company</div>
            <div className="space-y-2">
              <Link to="/about" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
              <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
              <Link to={loggedIn ? "/app" : "/login"} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                {loggedIn ? "Open App" : "Sign in"}
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6 text-center">
          <div className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Jaibber. All rights reserved.
            {" · "}
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            {" · "}
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
