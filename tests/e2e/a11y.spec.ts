import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Runs axe on the public surfaces of the app, writes a combined report
 * to a11y-report.json at the repo root, and fails the run on any critical
 * violation. CI uploads the JSON as an artefact.
 *
 * Two surfaces (home, preview fixture) need an authenticated session under
 * the auth-first proxy — we sign in as a viewer per test before scanning.
 */

const TARGETS = [
  { name: "home", path: "/", auth: true },
  { name: "login", path: "/login", auth: false },
  { name: "preview-fixture", path: "/preview/fixture", auth: false },
];

interface Result {
  name: string;
  url: string;
  violations: { id: string; impact: string | null; nodes: number }[];
}

const ALL: Result[] = [];

for (const target of TARGETS) {
  test(`axe: ${target.name} (${target.path})`, async ({ page, context }, testInfo) => {
    if (target.auth) {
      const res = await context.request.post("/api/auth/login", {
        data: { username: "viewer" },
      });
      expect(res.ok()).toBe(true);
    }

    await page.goto(target.path);
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
    JSON.stringify(
      { generatedAt: new Date().toISOString(), results: ALL },
      null,
      2
    )
  );
});
