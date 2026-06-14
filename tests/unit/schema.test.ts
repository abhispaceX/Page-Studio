import { describe, expect, it } from "vitest";

import {
  SectionSchema,
  PageSchema,
  HeroPropsSchema,
  CtaPropsSchema,
  FeatureGridPropsSchema,
  TestimonialPropsSchema,
} from "@/lib/schema";

describe("Hero props", () => {
  it("accepts a valid hero", () => {
    const r = HeroPropsSchema.safeParse({
      heading: "Welcome",
      subheading: "Build pages",
      ctaLabel: "Start",
      ctaHref: "/start",
    });
    expect(r.success).toBe(true);
  });

  it("requires a heading", () => {
    const r = HeroPropsSchema.safeParse({ subheading: "no heading" });
    expect(r.success).toBe(false);
  });
});

describe("FeatureGrid props", () => {
  it("requires at least one item", () => {
    const r = FeatureGridPropsSchema.safeParse({
      heading: "Features",
      items: [],
    });
    expect(r.success).toBe(false);
  });

  it("accepts valid grid", () => {
    const r = FeatureGridPropsSchema.safeParse({
      heading: "Features",
      items: [{ title: "Fast", body: "Very" }],
    });
    expect(r.success).toBe(true);
  });
});

describe("Testimonial props", () => {
  it("requires quote and author", () => {
    const r = TestimonialPropsSchema.safeParse({ quote: "Great" });
    expect(r.success).toBe(false);
  });
});

describe("CTA props", () => {
  it("requires label and href", () => {
    const r = CtaPropsSchema.safeParse({ label: "Go" });
    expect(r.success).toBe(false);
  });
});

describe("Section discriminated union", () => {
  it("routes by type", () => {
    const hero = SectionSchema.safeParse({
      id: "h1",
      type: "hero",
      props: { heading: "Hi" },
    });
    expect(hero.success).toBe(true);

    const wrong = SectionSchema.safeParse({
      id: "h1",
      type: "hero",
      props: { quote: "Hi" },
    });
    expect(wrong.success).toBe(false);

    const unknown = SectionSchema.safeParse({
      id: "x",
      type: "carousel",
      props: {},
    });
    expect(unknown.success).toBe(false);
  });
});

describe("Page schema", () => {
  it("accepts a valid page", () => {
    const r = PageSchema.safeParse({
      pageId: "landing",
      slug: "landing",
      title: "Landing",
      sections: [
        { id: "h1", type: "hero", props: { heading: "Hi" } },
        {
          id: "c1",
          type: "cta",
          props: { label: "Go", href: "/x" },
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects an invalid section nested in a page", () => {
    const r = PageSchema.safeParse({
      pageId: "landing",
      slug: "landing",
      title: "Landing",
      sections: [{ id: "h1", type: "hero", props: {} }],
    });
    expect(r.success).toBe(false);
  });
});
