import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CtaProps } from "@/lib/schema";

export function CTA({ label, href, variant = "primary", description }: CtaProps) {
  return (
    <section
      aria-labelledby="cta-heading"
      className="bg-primary text-primary-foreground py-16"
    >
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 id="cta-heading" className="text-3xl font-semibold tracking-tight">
          {description ?? "Ready to get started?"}
        </h2>
        <div className="mt-8">
          <a
            href={href}
            data-testid="cta-button"
            className={cn(
              buttonVariants({
                size: "lg",
                variant: variant === "secondary" ? "secondary" : "outline",
              }),
              "bg-background text-foreground hover:bg-background/90"
            )}
          >
            {label}
          </a>
        </div>
      </div>
    </section>
  );
}
