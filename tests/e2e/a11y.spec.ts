import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Runs axe on the public surfaces of the app, writes a single combined
 * report to a11y-report.json at the repo root, and fails the run on any
 * critical violation. CI uploads the JSON as an artefact.
 */

const TARGETS = [
  { name: "home", path: "/" },
  { name: "login", path: "/login" },
  { name: "preview", path: "/preview/fixture" },
];

interface Result {
  name: string;
  url: string;
  violations: { id: string; impact: string | null; nodes: number }[];
}

const ALL: Result[] = [];

for (const target of TARGETS) {
  test(`axe: ${target.name} (${target.path})`, async ({ page }, testInfo) => {
    await page.goto(target.path);
    // Disable colour-contrast for the temporary preview banner that appears
    // only in dev draft mode; we audit the real surfaces explicitly.
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    ALL.push({
      name: target.name,
      url: page.url(),
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact ?? null,
        nodes: v.nodes.length,
      })),
    });

    // CI fails on any "critical" violation, per brief.
    const critical = results.violations.filter((v) => v.impact === "critical");
    if (critical.length > 0) {
      testInfo.attach(`${target.name}-axe.json`, {
        body: JSON.stringify(results.violations, null, 2),
        contentType: "application/json",
      });
    }
    expect(
      critical,
      `Critical a11y violations on ${target.path}: ${critical
        .map((v) => v.id)
        .join(", ")}`
    ).toEqual([]);
  });
}

test.afterAll(async () => {
  const file = path.join(process.cwd(), "a11y-report.json");
  await fs.writeFile(
    file,
    JSON.stringify({ generatedAt: new Date().toISOString(), results: ALL }, null, 2)
  );
});
