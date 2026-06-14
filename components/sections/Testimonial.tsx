import Image from "next/image";
import type { TestimonialProps } from "@/lib/schema";

export function Testimonial({ quote, author, role, avatarUrl }: TestimonialProps) {
  return (
    <section
      aria-labelledby="testimonial-heading"
      className="bg-background py-16 sm:py-24"
    >
      <h2 id="testimonial-heading" className="sr-only">
        Testimonial
      </h2>
      <figure className="mx-auto max-w-3xl px-6 text-center">
        <blockquote className="text-2xl font-medium leading-relaxed">
          <p>&ldquo;{quote}&rdquo;</p>
        </blockquote>
        <figcaption className="mt-8 flex items-center justify-center gap-4">
          {avatarUrl ? (
            <span className="relative h-12 w-12 overflow-hidden rounded-full">
              <Image
                src={avatarUrl}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            </span>
          ) : null}
          <span className="text-left">
            <span className="block font-semibold">{author}</span>
            {role ? (
              <span className="block text-sm text-muted-foreground">{role}</span>
            ) : null}
          </span>
        </figcaption>
      </figure>
    </section>
  );
}
