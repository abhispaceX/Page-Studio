import {
  UnknownSectionEnvelopeSchema,
  RawPageSchema,
  type RawPage,
  type UnknownSectionEnvelope,
} from "@/lib/schema";

/**
 * Map a raw Contentful Page entry to our domain `RawPage`.
 *
 * Editors author the `sections` JSON by hand, and Contentful gives them no
 * schema enforcement on a JSON Object field. To survive the common shapes
 * we see in practice, the mapper does two things:
 *
 *  1. Unwrap the sections array if it was authored inside an envelope
 *     object (e.g. `{ "sections": [ ... ] }` or `{ "items": [ ... ] }`).
 *  2. Normalize common synonym prop names per section type
 *     (`title` → `heading`, `buttonText` → `ctaLabel`, etc).
 *
 * The renderer is still strict — anything we can't normalize falls back to
 * the inline error or `<UnsupportedSection>`.
 *
 * Per the build plan we alias the Contentful `slug` to `pageId`; there is
 * no separate `pageId` field on the Contentful Page content type.
 */
export function mapContentfulPage(entry: {
  sys: { id: string };
  fields: { slug: string; title: string; sections?: unknown };
}): RawPage {
  const sectionsRaw = extractSectionsArray(entry.fields.sections);

  const sections: UnknownSectionEnvelope[] = sectionsRaw.flatMap((s, idx) => {
    const normalized = normalizeSection(s);
    if (!normalized) {
      console.warn(
        `[contentful] Dropping section at index ${idx} of "${entry.fields.slug}" — missing id/type`
      );
      return [];
    }
    const parsed = UnknownSectionEnvelopeSchema.safeParse(normalized);
    if (!parsed.success) {
      console.warn(
        `[contentful] Dropping malformed section at index ${idx} of "${entry.fields.slug}":`,
        parsed.error.issues
      );
      return [];
    }
    return [parsed.data];
  });

  return RawPageSchema.parse({
    pageId: entry.fields.slug,
    slug: entry.fields.slug,
    title: entry.fields.title,
    sections,
  });
}

/**
 * Accept three common shapes for the `sections` field value:
 *   - Direct array: [ {...}, {...} ]            ← what the app emits
 *   - Wrapped:       { sections: [ {...} ] }     ← common editor mistake
 *   - Alternative:   { items:    [ {...} ] }
 * Anything else is treated as "no sections".
 */
function extractSectionsArray(fieldValue: unknown): unknown[] {
  if (Array.isArray(fieldValue)) return fieldValue;
  if (fieldValue && typeof fieldValue === "object") {
    const obj = fieldValue as Record<string, unknown>;
    if (Array.isArray(obj.sections)) return obj.sections;
    if (Array.isArray(obj.items)) return obj.items;
  }
  return [];
}

/**
 * Normalize a single section's props against the canonical names declared
 * in `lib/schema/section.ts`. Only fills target keys when they're missing —
 * never overwrites editor-authored canonical values.
 */
function normalizeSection(s: unknown): UnknownSectionEnvelope | null {
  if (!s || typeof s !== "object") return null;
  const raw = s as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.type !== "string") return null;

  const props: Record<string, unknown> = {
    ...(raw.props && typeof raw.props === "object"
      ? (raw.props as Record<string, unknown>)
      : {}),
  };

  const setIfMissing = (key: string, value: unknown) => {
    if (value !== undefined && props[key] === undefined) props[key] = value;
  };

  switch (raw.type) {
    case "hero":
      setIfMissing("heading", props.title ?? props.headline);
      setIfMissing("subheading", props.subtitle ?? props.subtitle1);
      setIfMissing("ctaLabel", props.buttonText ?? props.ctaText);
      setIfMissing(
        "ctaHref",
        props.buttonHref ?? props.buttonUrl ?? props.href ?? props.url
      );
      setIfMissing("imageUrl", props.image ?? props.imageSrc);
      break;
    case "cta":
      setIfMissing("label", props.buttonText ?? props.ctaText ?? props.text);
      setIfMissing(
        "href",
        props.buttonHref ?? props.buttonUrl ?? props.url ?? props.link
      );
      setIfMissing("description", props.title ?? props.headline);
      // CTA requires href; default to "#" so the section renders instead of
      // being dropped. A console warning makes this visible during authoring.
      if (props.href === undefined && props.label) {
        console.warn(
          `[contentful] CTA section "${raw.id}" missing href; defaulting to "#".`
        );
        props.href = "#";
      }
      break;
    case "featureGrid":
      setIfMissing("heading", props.title ?? props.headline);
      if (Array.isArray(props.features) && !props.items) {
        props.items = props.features;
      }
      break;
    case "testimonial":
      setIfMissing("quote", props.text ?? props.body);
      setIfMissing("author", props.name);
      setIfMissing("role", props.title);
      setIfMissing("avatarUrl", props.image ?? props.avatar);
      break;
    default:
      // Unknown type — leave props untouched; renderer will show
      // <UnsupportedSection>.
      break;
  }

  return {
    id: raw.id,
    type: raw.type,
    props,
  };
}
