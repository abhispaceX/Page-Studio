import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HeroProps } from "@/lib/schema";

export function Hero({ heading, subheading, ctaLabel, ctaHref, imageUrl }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-background py-16 sm:py-24"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:items-center">
        <div>
          <h1
            id="hero-heading"
            className="text-4xl font-semibold tracking-tight sm:text-5xl"
          >
            {heading}
          </h1>
          {subheading ? (
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {subheading}
            </p>
          ) : null}
          {ctaLabel && ctaHref ? (
            <div className="mt-8">
              <a
                href={ctaHref}
                className={cn(buttonVariants({ size: "lg" }))}
                data-testid="hero-cta"
              >
                {ctaLabel}
              </a>
            </div>
          ) : null}
        </div>
        {imageUrl ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
