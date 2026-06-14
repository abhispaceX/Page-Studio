import type { ComponentType } from "react";
import type { ZodTypeAny } from "zod";

import { Hero } from "@/components/sections/Hero";
import { FeatureGrid } from "@/components/sections/FeatureGrid";
import { Testimonial } from "@/components/sections/Testimonial";
import { CTA } from "@/components/sections/CTA";

import {
  HeroPropsSchema,
  FeatureGridPropsSchema,
  TestimonialPropsSchema,
  CtaPropsSchema,
  type SectionType,
} from "@/lib/schema";

export interface SectionRegistryEntry {
  /** Human label used in the Studio "Add section" menu. */
  label: string;
  /** Zod schema for the section's `props`. */
  schema: ZodTypeAny;
  /**
   * Presentational component. Props are validated by `schema` at runtime in
   * <SectionRenderer>, so we accept any here to keep the heterogeneous union
   * of section components assignable to a single registry shape.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
  /** Defaults used when an editor adds a new instance in the Studio. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultProps: Record<string, any>;
}

/**
 * SINGLE SOURCE OF TRUTH for section wiring.
 *
 * The `satisfies` clause forces this object to cover every member of
 * `SectionType`. Remove an entry, and TypeScript fails the build —
 * which is the brief's "removing a registry entry breaks TS" requirement.
 */
export const sectionRegistry = {
  hero: {
    label: "Hero",
    schema: HeroPropsSchema,
    component: Hero,
    defaultProps: {
      heading: "Build pages without the engineering tax",
      subheading: "Drag, drop, publish. Version control comes free.",
      ctaLabel: "Get started",
      ctaHref: "#",
    },
  },
  featureGrid: {
    label: "Feature Grid",
    schema: FeatureGridPropsSchema,
    component: FeatureGrid,
    defaultProps: {
      heading: "Why teams choose Page Studio",
      items: [
        { title: "Schema-driven", body: "Every section is validated by Zod before render." },
        { title: "Immutable releases", body: "SemVer-bumped snapshots, never overwritten." },
        { title: "Accessible by default", body: "AAA contrast, full keyboard support." },
      ],
    },
  },
  testimonial: {
    label: "Testimonial",
    schema: TestimonialPropsSchema,
    component: Testimonial,
    defaultProps: {
      quote: "It replaced four bespoke landing pages in a week.",
      author: "Alex Reyes",
      role: "Head of Growth",
    },
  },
  cta: {
    label: "Call to action",
    schema: CtaPropsSchema,
    component: CTA,
    defaultProps: {
      label: "Talk to sales",
      href: "/contact",
      variant: "primary",
      description: "Ready when you are.",
    },
  },
} satisfies Record<SectionType, SectionRegistryEntry>;

export type RegisteredSectionType = keyof typeof sectionRegistry;

export function isRegisteredSectionType(t: string): t is RegisteredSectionType {
  return Object.prototype.hasOwnProperty.call(sectionRegistry, t);
}
