import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { FeatureGridProps } from "@/lib/schema";

export function FeatureGrid({ heading, items }: FeatureGridProps) {
  return (
    <section
      aria-labelledby="features-heading"
      className="bg-muted/30 py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2
          id="features-heading"
          className="text-3xl font-semibold tracking-tight"
        >
          {heading}
        </h2>
        <ul
          role="list"
          className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((item, i) => (
            <li key={`${item.title}-${i}`}>
              <Card className="h-full">
                <CardHeader>
                  {item.icon ? (
                    <span aria-hidden="true" className="text-2xl">
                      {item.icon}
                    </span>
                  ) : null}
                  <h3 className="text-lg font-semibold leading-none tracking-tight">
                    {item.title}
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
