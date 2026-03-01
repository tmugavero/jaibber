import { cn } from "@/lib/cn";

interface UseCaseCardProps {
  icon: React.ReactNode;
  persona: string;
  title: string;
  description: string;
  bullets: string[];
  className?: string;
}

export function UseCaseCard({ icon, persona, title, description, bullets, className }: UseCaseCardProps) {
  return (
    <div className={cn("bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors", className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <div className="text-xs font-semibold text-primary">{persona}</div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{description}</p>
      <ul className="space-y-2">
        {bullets.map((b) => (
          <li key={b} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-primary mt-0.5 shrink-0">+</span>
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
