import { test, expect } from "@playwright/test";

test.describe("Preview renders schema-driven page", () => {
  test("all 4 known section types render, unknown falls back", async ({
    page,
  }) => {
    await page.goto("/preview/fixture");

    // Hero
    await expect(
      page.getByRole("heading", { level: 1, name: /Page Studio Demo/i })
    ).toBeVisible();

    // Feature grid
    await expect(
      page.getByRole("heading", { level: 2, name: /Why teams choose this/i })
    ).toBeVisible();

    // Testimonial
    await expect(page.locator("blockquote")).toContainText(
      "replaced four bespoke landing pages"
    );

    // CTA
    await expect(page.getByTestId("cta-button")).toBeVisible();

    // Unsupported fallback
    await expect(page.getByText(/Unsupported section/i)).toBeVisible();
  });

  test("CTA interaction navigates", async ({ page }) => {
    await page.goto("/preview/fixture");
    const cta = page.getByTestId("cta-button");
    await expect(cta).toHaveAttribute("href", "/contact");
    // We don't assert navigation success — /contact doesn't exist — but a
    // click should at least trigger navigation away from /__fixture.
    await Promise.all([
      page.waitForURL((u) => u.pathname !== "/preview/fixture"),
      cta.click(),
    ]);
  });

  test("hero CTA renders with correct label and href", async ({ page }) => {
    await page.goto("/preview/fixture");
    const heroCta = page.getByTestId("hero-cta");
    await expect(heroCta).toHaveText(/Get started/);
    await expect(heroCta).toHaveAttribute("href", "#features");
  });
});
