import { describe, expect, it } from "vitest";

import { diffPages, pagesEqual } from "@/lib/publish/diff";
import { bumpVersion } from "@/lib/publish/version";
import type { Page } from "@/lib/schema";

/**
 * Walks the same code path as the publish orchestrator without doing I/O:
 * given the same draft as the latest release, the result is the same version
 * (no bump), and the changes list is empty.
 */
const PAGE: Page = {
  pageId: "landing",
  slug: "landing",
  title: "Landing",
  sections: [
    {
      id: "h1",
      type: "hero",
      props: { heading: "Hi", ctaLabel: "Go", ctaHref: "/x" },
    },
  ],
};

describe("publish idempotency", () => {
  it("same draft produces same version", () => {
    const latest = { version: "1.4.2", snapshot: PAGE };
    const draft = JSON.parse(JSON.stringify(PAGE)) as Page;

    const equal = pagesEqual(latest.snapshot, draft);
    expect(equal).toBe(true);

    const { bump } = diffPages(latest.snapshot, draft);
    expect(bump).toBe("none");

    const next = bumpVersion(latest.version, bump);
    expect(next).toBe(latest.version);
  });

  it("a single text edit cuts a new patch", () => {
    const latest = { version: "1.4.2", snapshot: PAGE };
    const draft = JSON.parse(JSON.stringify(PAGE)) as Page;
    (draft.sections[0].props as { heading: string }).heading = "Hello";

    const { bump } = diffPages(latest.snapshot, draft);
    expect(bump).toBe("patch");

    expect(bumpVersion(latest.version, bump)).toBe("1.4.3");
  });
});
