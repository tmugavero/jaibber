import { cn } from "@/lib/cn";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

export function FeatureCard({ icon, title, description, className, children }: FeatureCardProps) {
  return (
    <div className={cn("bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors", className)}>
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      {children}
    </div>
  );
}
