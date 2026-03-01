import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  badge?: string;
  centered?: boolean;
}

export function SectionHeading({ title, subtitle, badge, centered = true }: SectionHeadingProps) {
  return (
    <div className={cn(centered && "text-center", "mb-12")}>
      {badge && (
        <div className={cn("inline-block text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1 mb-4", centered && "mx-auto")}>
          {badge}
        </div>
      )}
      <h2 className="text-3xl font-bold">{title}</h2>
      {subtitle && (
        <p className={cn("mt-4 text-lg text-muted-foreground leading-relaxed", centered && "max-w-2xl mx-auto")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
