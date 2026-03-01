import { Link } from "react-router-dom";

interface CTASectionProps {
  title: string;
  subtitle: string;
  buttonText?: string;
  buttonTo?: string;
}

export function CTASection({ title, subtitle, buttonText = "Get Started Free", buttonTo = "/login" }: CTASectionProps) {
  return (
    <section className="py-20 px-6 border-t border-border">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">{title}</h2>
        <p className="text-muted-foreground mb-8">{subtitle}</p>
        <Link
          to={buttonTo}
          className="inline-block bg-primary text-primary-foreground rounded-xl px-8 py-3.5 text-base font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
