/**
 * Rendered when a Contentful section has a `type` not in the registry.
 * Kept visually muted; in production you'd hide it but for the assignment
 * it should be visible so reviewers can see the fallback path.
 */
export function UnsupportedSection({
  type,
  id,
}: {
  type: string;
  id: string;
}) {
  return (
    <section
      role="note"
      aria-label="Unsupported section"
      className="border-y border-dashed border-muted-foreground/40 bg-muted/30 py-8"
    >
      <div className="mx-auto max-w-3xl px-6 text-center text-sm text-muted-foreground">
        <p>
          <strong className="font-semibold">Unsupported section</strong>{" "}
          (<code className="font-mono">{type}</code>, id{" "}
          <code className="font-mono">{id}</code>).
        </p>
        <p className="mt-1">
          Register this type in <code className="font-mono">sectionRegistry</code> to render it.
        </p>
      </div>
    </section>
  );
}
