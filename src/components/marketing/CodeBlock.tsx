import { cn } from "@/lib/cn";

interface CodeBlockProps {
  code: string;
  title?: string;
  className?: string;
}

export function CodeBlock({ code, title, className }: CodeBlockProps) {
  return (
    <div className={cn("bg-card border border-border rounded-xl overflow-hidden", className)}>
      {title && (
        <div className="px-4 py-2 border-b border-border text-xs font-semibold text-muted-foreground bg-muted/20">
          {title}
        </div>
      )}
      <pre className="p-4 text-sm font-mono text-foreground overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
