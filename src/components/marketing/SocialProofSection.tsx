export function SocialProofSection() {
  return (
    <section className="py-16 px-6 border-t border-border">
      <div className="max-w-5xl mx-auto">
        {/* Placeholder logos */}
        <p className="text-center text-sm text-muted-foreground mb-8">
          Trusted by engineering teams building with AI
        </p>
        <div className="flex items-center justify-center gap-8 flex-wrap opacity-40">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-24 h-8 bg-muted/30 rounded-md"
            />
          ))}
        </div>

        {/* Placeholder testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-card border border-border rounded-xl p-6">
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    title: "Senior Engineer, Acme Corp",
    quote: "We have three agents running on different machines that coordinate through Jaibber. Our CI pipeline went from 45 minutes of manual testing to fully automated.",
  },
  {
    name: "Marcus Johnson",
    title: "VP Product, TechStart",
    quote: "Our product team can finally interact with AI agents without needing to touch the terminal. The web client changed everything for us.",
  },
  {
    name: "Elena Rodriguez",
    title: "DevOps Lead, CloudScale",
    quote: "The multi-backend support means we're not locked into one provider. We use Claude for code, Gemini for docs, and our own custom agents for deployment.",
  },
];
