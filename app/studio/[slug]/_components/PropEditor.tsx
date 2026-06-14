"use client";

import { Pencil, Settings2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  updatePageMeta,
  updateProps,
} from "@/store/slices/draftPageSlice";
import { sectionRegistry, type RegisteredSectionType } from "@/lib/sectionRegistry";

/**
 * Limited prop editor per brief: Hero text, CTA label + URL.
 * Page title is also editable. Other section types render a small notice;
 * their props can still be authored in Contentful and they render fine.
 */
export function PropEditor() {
  const page = useAppSelector((s) => s.draftPage.page);
  const selectedId = useAppSelector((s) => s.ui.selectedSectionId);
  const section = page?.sections.find((s) => s.id === selectedId) ?? null;

  if (!page) return null;

  return (
    <aside
      aria-label="Properties"
      className="flex h-full w-full flex-col border-l bg-card text-card-foreground"
    >
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Properties
        </h2>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <PageMetaEditor pageTitle={page.title} pageSlug={page.slug} />

        {section ? (
          <SectionEditor key={section.id} sectionId={section.id} />
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
            <Pencil
              className="mx-auto h-5 w-5 text-muted-foreground"
              aria-hidden
            />
            <p className="mt-2 text-sm font-medium">No section selected</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick a section from the left to edit its props.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

function PageMetaEditor({ pageTitle, pageSlug }: { pageTitle: string; pageSlug: string }) {
  const dispatch = useAppDispatch();
  return (
    <section aria-labelledby="page-meta-h">
      <header className="mb-3 flex items-center justify-between">
        <h3 id="page-meta-h" className="text-sm font-semibold">
          Page
        </h3>
        <span className="font-mono text-[11px] text-muted-foreground">
          /{pageSlug}
        </span>
      </header>
      <div className="space-y-3 rounded-lg border bg-background p-3">
        <FieldRow>
          <Label htmlFor="page-title">Title</Label>
          <Input
            id="page-title"
            value={pageTitle}
            onChange={(e) => dispatch(updatePageMeta({ title: e.target.value }))}
          />
        </FieldRow>
      </div>
    </section>
  );
}

function SectionEditor({ sectionId }: { sectionId: string }) {
  const dispatch = useAppDispatch();
  const section = useAppSelector((s) =>
    s.draftPage.page?.sections.find((sec) => sec.id === sectionId)
  );
  if (!section) return null;

  const entryLabel =
    sectionRegistry[section.type as RegisteredSectionType]?.label ??
    section.type;
  const props = section.props as Record<string, unknown>;

  const setProp = (key: string, value: unknown) =>
    dispatch(updateProps({ id: section.id, props: { [key]: value } }));

  return (
    <section aria-labelledby="section-h">
      <header className="mb-3 flex items-center justify-between">
        <h3 id="section-h" className="text-sm font-semibold">
          {entryLabel}
        </h3>
        <span className="rounded-full border bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {section.id}
        </span>
      </header>
      <div className="space-y-3 rounded-lg border bg-background p-3">
        {section.type === "hero" ? (
          <>
            <FieldRow>
              <Label htmlFor="hero-heading">
                Heading <Required />
              </Label>
              <Input
                id="hero-heading"
                value={(props.heading as string) ?? ""}
                aria-required
                onChange={(e) => setProp("heading", e.target.value)}
              />
            </FieldRow>
            <FieldRow>
              <Label htmlFor="hero-subheading">Sub-heading</Label>
              <Textarea
                id="hero-subheading"
                value={(props.subheading as string) ?? ""}
                onChange={(e) => setProp("subheading", e.target.value)}
              />
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow>
                <Label htmlFor="hero-cta-label">CTA label</Label>
                <Input
                  id="hero-cta-label"
                  value={(props.ctaLabel as string) ?? ""}
                  onChange={(e) => setProp("ctaLabel", e.target.value)}
                />
              </FieldRow>
              <FieldRow>
                <Label htmlFor="hero-cta-href">CTA URL</Label>
                <Input
                  id="hero-cta-href"
                  inputMode="url"
                  value={(props.ctaHref as string) ?? ""}
                  onChange={(e) => setProp("ctaHref", e.target.value)}
                />
              </FieldRow>
            </div>
          </>
        ) : null}

        {section.type === "cta" ? (
          <>
            <FieldRow>
              <Label htmlFor="cta-label">
                Label <Required />
              </Label>
              <Input
                id="cta-label"
                value={(props.label as string) ?? ""}
                aria-required
                onChange={(e) => setProp("label", e.target.value)}
              />
            </FieldRow>
            <FieldRow>
              <Label htmlFor="cta-href">
                URL <Required />
              </Label>
              <Input
                id="cta-href"
                inputMode="url"
                value={(props.href as string) ?? ""}
                aria-required
                onChange={(e) => setProp("href", e.target.value)}
              />
            </FieldRow>
          </>
        ) : null}

        {section.type === "featureGrid" ? (
          <FieldRow>
            <Label htmlFor="feature-heading">
              Heading <Required />
            </Label>
            <Input
              id="feature-heading"
              value={(props.heading as string) ?? ""}
              aria-required
              onChange={(e) => setProp("heading", e.target.value)}
            />
          </FieldRow>
        ) : null}

        {section.type === "testimonial" ? (
          <>
            <FieldRow>
              <Label htmlFor="testimonial-quote">
                Quote <Required />
              </Label>
              <Textarea
                id="testimonial-quote"
                value={(props.quote as string) ?? ""}
                aria-required
                onChange={(e) => setProp("quote", e.target.value)}
              />
            </FieldRow>
            <FieldRow>
              <Label htmlFor="testimonial-author">
                Author <Required />
              </Label>
              <Input
                id="testimonial-author"
                value={(props.author as string) ?? ""}
                aria-required
                onChange={(e) => setProp("author", e.target.value)}
              />
            </FieldRow>
          </>
        ) : null}
      </div>
    </section>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

function Required() {
  return (
    <span aria-label="required" className="text-destructive">
      *
    </span>
  );
}
