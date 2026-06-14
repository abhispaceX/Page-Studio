import { describe, expect, it } from "vitest";

import { diffPages, pagesEqual } from "@/lib/publish/diff";
import type { Page } from "@/lib/schema";

const base: Page = {
  pageId: "landing",
  slug: "landing",
  title: "Landing",
  sections: [
    { id: "h1", type: "hero", props: { heading: "Hello" } },
    {
      id: "c1",
      type: "cta",
      props: { label: "Go", href: "/x" },
    },
  ],
};

function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o));
}

describe("diffPages", () => {
  it("returns bump=none when no prior version", () => {
    const r = diffPages(null, base);
    expect(r.bump).toBe("none");
  });

  it("returns bump=none when identical", () => {
    const r = diffPages(base, clone(base));
    expect(r.bump).toBe("none");
    expect(r.changes).toHaveLength(0);
  });

  it("text/prop change is a patch", () => {
    const next = clone(base);
    (next.sections[0].props as { heading: string }).heading = "Hi there";
    const r = diffPages(base, next);
    expect(r.bump).toBe("patch");
    expect(r.changes.some((c) => c.kind === "prop.valueChanged")).toBe(true);
  });

  it("adding a section is a minor", () => {
    const next = clone(base);
    next.sections.push({
      id: "t1",
      type: "testimonial",
      props: { quote: "Great", author: "Alex" },
    });
    const r = diffPages(base, next);
    expect(r.bump).toBe("minor");
    expect(r.changes.some((c) => c.kind === "section.added")).toBe(true);
  });

  it("adding an optional prop is a minor", () => {
    const next = clone(base);
    (next.sections[0].props as Record<string, unknown>).subheading =
      "Now with subhead";
    const r = diffPages(base, next);
    expect(r.bump).toBe("minor");
    expect(r.changes.some((c) => c.kind === "prop.added.optional")).toBe(true);
  });

  it("removing a section is a major", () => {
    const next = clone(base);
    next.sections.pop();
    const r = diffPages(base, next);
    expect(r.bump).toBe("major");
    expect(r.changes.some((c) => c.kind === "section.removed")).toBe(true);
  });

  it("changing a section type is a major", () => {
    const next = clone(base);
    next.sections[0] = {
      id: "h1",
      type: "cta",
      props: { label: "Now CTA", href: "/x" },
    };
    const r = diffPages(base, next);
    expect(r.bump).toBe("major");
    expect(r.changes.some((c) => c.kind === "section.typeChanged")).toBe(true);
  });

  it("removing a required prop is a major", () => {
    const next = clone(base);
    delete (next.sections[1].props as Record<string, unknown>).href;
    const r = diffPages(base, next);
    expect(r.bump).toBe("major");
    expect(r.changes.some((c) => c.kind === "prop.removed.required")).toBe(true);
  });

  it("reorder is a patch", () => {
    const next = clone(base);
    next.sections = [next.sections[1], next.sections[0]];
    const r = diffPages(base, next);
    expect(r.bump).toBe("patch");
    expect(r.changes.some((c) => c.kind === "section.moved")).toBe(true);
  });

  it("title-only change is a patch", () => {
    const next = clone(base);
    next.title = "Renamed";
    const r = diffPages(base, next);
    expect(r.bump).toBe("patch");
    expect(r.changes.some((c) => c.kind === "page.titleChanged")).toBe(true);
  });

  it("multiple changes take the highest bump", () => {
    const next = clone(base);
    (next.sections[0].props as { heading: string }).heading = "New"; // patch
    next.sections.pop(); // major
    const r = diffPages(base, next);
    expect(r.bump).toBe("major");
  });

  it("is deterministic across runs", () => {
    const next = clone(base);
    (next.sections[0].props as { heading: string }).heading = "X";
    const a = diffPages(base, next);
    const b = diffPages(base, next);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("pagesEqual", () => {
  it("ignores key ordering noise", () => {
    const a = clone(base);
    const b: Page = {
      title: "Landing",
      slug: "landing",
      pageId: "landing",
      sections: [
        { id: "h1", type: "hero", props: { heading: "Hello" } },
        { id: "c1", type: "cta", props: { href: "/x", label: "Go" } },
      ],
    };
    expect(pagesEqual(a, b)).toBe(true);
  });
});
