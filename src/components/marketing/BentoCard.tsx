import { cn } from "@/lib/cn";

interface BentoCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  span?: "1" | "2";
  visual?: React.ReactNode;
  className?: string;
}

export function BentoCard({ icon, title, description, span = "1", visual, className }: BentoCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors",
        span === "2" && "md:col-span-2",
        span === "2" && visual && "md:flex md:items-center md:gap-8",
        className,
      )}
    >
      <div className={cn(span === "2" && visual && "md:flex-1")}>
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {visual && (
        <div className={cn("mt-6", span === "2" && "md:mt-0 md:flex-1")}>
          {visual}
        </div>
      )}
    </div>
  );
}
