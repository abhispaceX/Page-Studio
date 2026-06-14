import { test, expect } from "@playwright/test";

/**
 * Studio flow tests. The Studio currently fetches its initial page from
 * Contentful, which is environment-dependent — these tests are wrapped in
 * a guard that skips when Contentful env is not configured for the run.
 * The fixture-driven preview tests provide the schema-renderer coverage in CI.
 */
const HAS_CONTENTFUL =
  !!process.env.CONTENTFUL_SPACE_ID &&
  process.env.CONTENTFUL_SPACE_ID !== "x" &&
  !!process.env.CONTENTFUL_DELIVERY_TOKEN;

const STUDIO_SLUG = process.env.E2E_STUDIO_SLUG ?? "landing";

test.describe("Studio editor", () => {
  test.skip(!HAS_CONTENTFUL, "Contentful env not configured for this run");

  test("editor sees the 3-panel studio shell", async ({ page, context }) => {
    await context.request.post("/api/auth/login", {
      data: { username: "editor" },
    });
    await page.goto(`/studio/${STUDIO_SLUG}`);

    await expect(page.getByRole("complementary", { name: /Section list/i })).toBeVisible();
    await expect(page.getByText(/Live preview/i)).toBeVisible();
    await expect(page.getByText(/Properties/i)).toBeVisible();
  });

  test("editor can add a section and see it in the preview", async ({
    page,
    context,
  }) => {
    await context.request.post("/api/auth/login", {
      data: { username: "editor" },
    });
    await page.goto(`/studio/${STUDIO_SLUG}`);

    const initial = await page
      .getByRole("complementary", { name: /Section list/i })
      .locator("ol li")
      .count();

    await page.getByRole("button", { name: /Add section CTA|Call to action/i }).first().click();

    await expect(
      page.getByRole("complementary", { name: /Section list/i }).locator("ol li")
    ).toHaveCount(initial + 1);
  });
});
