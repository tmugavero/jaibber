import { cn } from "@/lib/cn";

interface Props {
  inline?: boolean;
}

export function TypingIndicator({ inline }: Props) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", inline && "ml-1")}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
        />
      ))}
    </span>
  );
}
