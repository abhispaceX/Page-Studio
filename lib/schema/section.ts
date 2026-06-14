import { z } from "zod";

/**
 * Section schemas. Each variant owns its `props` schema. The discriminated
 * union on `type` is what `<SectionRenderer>` validates against, and what the
 * `sectionRegistry` mirrors at runtime. Adding a section type means:
 *   1. Export its schema here
 *   2. Add it to SectionSchema's discriminated union
 *   3. Register the component in lib/sectionRegistry.ts
 *   4. TS will then refuse to build until SectionType is exhaustive
 */

const idField = z.string().min(1, "Section id is required");

export const HeroPropsSchema = z.object({
  heading: z.string().min(1, "Hero heading is required"),
  subheading: z.string().optional(),
  ctaLabel: z.string().optional(),
  // Accept any non-empty string: absolute URLs, root-relative paths, and
  // in-page anchors (e.g. "#features") are all valid hrefs.
  ctaHref: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
});

export const FeatureGridItemSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  icon: z.string().optional(),
});

export const FeatureGridPropsSchema = z.object({
  heading: z.string().min(1),
  items: z.array(FeatureGridItemSchema).min(1, "At least one feature is required"),
});

export const TestimonialPropsSchema = z.object({
  quote: z.string().min(1),
  author: z.string().min(1),
  role: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

export const CtaPropsSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  variant: z.enum(["primary", "secondary"]).optional(),
  description: z.string().optional(),
});

export const HeroSectionSchema = z.object({
  id: idField,
  type: z.literal("hero"),
  props: HeroPropsSchema,
});

export const FeatureGridSectionSchema = z.object({
  id: idField,
  type: z.literal("featureGrid"),
  props: FeatureGridPropsSchema,
});

export const TestimonialSectionSchema = z.object({
  id: idField,
  type: z.literal("testimonial"),
  props: TestimonialPropsSchema,
});

export const CtaSectionSchema = z.object({
  id: idField,
  type: z.literal("cta"),
  props: CtaPropsSchema,
});

export const SectionSchema = z.discriminatedUnion("type", [
  HeroSectionSchema,
  FeatureGridSectionSchema,
  TestimonialSectionSchema,
  CtaSectionSchema,
]);

export type SectionType = z.infer<typeof SectionSchema>["type"];
export type Section = z.infer<typeof SectionSchema>;
export type HeroSection = z.infer<typeof HeroSectionSchema>;
export type FeatureGridSection = z.infer<typeof FeatureGridSectionSchema>;
export type TestimonialSection = z.infer<typeof TestimonialSectionSchema>;
export type CtaSection = z.infer<typeof CtaSectionSchema>;

export type HeroProps = z.infer<typeof HeroPropsSchema>;
export type FeatureGridProps = z.infer<typeof FeatureGridPropsSchema>;
export type TestimonialProps = z.infer<typeof TestimonialPropsSchema>;
export type CtaProps = z.infer<typeof CtaPropsSchema>;

/**
 * Lenient parser used when reading from Contentful: validates the discriminant
 * (`type` + `id`) but lets us collect per-section errors so one bad section
 * doesn't blow away the whole page.
 */
export const UnknownSectionEnvelopeSchema = z.object({
  id: idField,
  type: z.string().min(1),
  props: z.record(z.string(), z.unknown()).default({}),
});

export type UnknownSectionEnvelope = z.infer<typeof UnknownSectionEnvelopeSchema>;
