import fs from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";

import { SectionRenderer } from "@/components/SectionRenderer";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { RawPageSchema } from "@/lib/schema";

/**
 * Test-only fixture route. Renders a hardcoded Page from
 * tests/e2e/fixtures/seed-page.json so Playwright e2e + axe can run
 * deterministically in CI without depending on a live Contentful entry.
 *
 * The fixture intentionally includes one section with an unregistered type
 * to verify the <UnsupportedSection> fallback path.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demo (fixture)",
};

export default async function FixturePreview() {
  const file = path.join(process.cwd(), "tests/e2e/fixtures/seed-page.json");
  const raw = JSON.parse(await fs.readFile(file, "utf8"));
  const page = RawPageSchema.parse(raw);

  return (
    <main id="main" className="flex-1">
      <SectionErrorBoundary>
        <SectionRenderer sections={page.sections} />
      </SectionErrorBoundary>
    </main>
  );
}
