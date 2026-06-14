import { z } from "zod";
import { SectionSchema, UnknownSectionEnvelopeSchema } from "./section";

export const PageSchema = z.object({
  pageId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  sections: z.array(SectionSchema),
});

export type Page = z.infer<typeof PageSchema>;

/**
 * Looser Page schema used by the Contentful adapter. Sections are kept as
 * unknown envelopes so the renderer can decide per-section whether to render,
 * skip, or fall back to <UnsupportedSection> — instead of failing the whole
 * page on a single malformed section.
 */
export const RawPageSchema = z.object({
  pageId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  sections: z.array(UnknownSectionEnvelopeSchema),
});

export type RawPage = z.infer<typeof RawPageSchema>;
