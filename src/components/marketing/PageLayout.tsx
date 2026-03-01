import { MarketingNav, MarketingFooter } from "@/pages/MarketingNav";

export function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  );
}
