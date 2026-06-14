import * as React from "react";
import { sectionRegistry, isRegisteredSectionType } from "@/lib/sectionRegistry";
import { UnsupportedSection } from "@/components/sections/UnsupportedSection";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import type { UnknownSectionEnvelope } from "@/lib/schema";

interface Props {
  /**
   * Accept either fully-typed Sections (e.g. from the Studio's Redux state, which
   * was validated on the way in) or loosely-shaped envelopes from Contentful.
   * The renderer validates per-section and falls back gracefully.
   */
  sections: ReadonlyArray<UnknownSectionEnvelope>;
}

export function SectionRenderer({ sections }: Props) {
  return (
    <>
      {sections.map((section) => {
        if (!isRegisteredSectionType(section.type)) {
          return (
            <UnsupportedSection
              key={section.id}
              id={section.id}
              type={section.type}
            />
          );
        }

        const entry = sectionRegistry[section.type];
        const parsed = entry.schema.safeParse(section.props);

        if (!parsed.success) {
          return (
            <SectionErrorBoundary key={section.id}>
              <section
                role="alert"
                aria-live="polite"
                className="border-y border-dashed border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-destructive"
              >
                <p>
                  <strong className="font-semibold">Invalid section data</strong>{" "}
                  for <code className="font-mono">{section.type}</code> (id{" "}
                  <code className="font-mono">{section.id}</code>).
                </p>
                {process.env.NODE_ENV !== "production" ? (
                  <pre className="mx-auto mt-2 max-w-2xl whitespace-pre-wrap text-left text-xs">
                    {parsed.error.issues
                      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
                      .join("\n")}
                  </pre>
                ) : null}
              </section>
            </SectionErrorBoundary>
          );
        }

        // The registry returns ComponentType<any>; props were just validated by entry.schema.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Component = entry.component as React.ComponentType<any>;
        return (
          <SectionErrorBoundary key={section.id}>
            <Component {...(parsed.data as Record<string, unknown>)} />
          </SectionErrorBoundary>
        );
      })}
    </>
  );
}
