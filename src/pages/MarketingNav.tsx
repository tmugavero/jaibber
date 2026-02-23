import { Link, useLocation } from "react-router-dom";

export function MarketingNav() {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-foreground font-bold text-lg tracking-tight">
          <span className="text-xl">&#x26A1;</span>
          Jaibber
        </Link>

        <div className="hidden sm:flex items-center gap-6">
          <Link
            to="/#features"
            className={`text-sm transition-colors ${
              location.pathname === "/" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Features
          </Link>
          <Link
            to="/pricing"
            className={`text-sm transition-colors ${
              location.pathname === "/pricing" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/login"
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-foreground font-bold tracking-tight">
            <span className="text-lg">&#x26A1;</span>
            Jaibber
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Sign in</Link>
          </div>
          <div className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Jaibber. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
