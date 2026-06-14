import { test, expect } from "@playwright/test";

async function loginAs(
  request: import("@playwright/test").APIRequestContext,
  username: "viewer" | "editor" | "publisher"
) {
  const res = await request.post("/api/auth/login", {
    data: { username },
  });
  expect(res.ok()).toBe(true);
}

test.describe("RBAC enforcement (server-side)", () => {
  test("anonymous request to /studio is redirected to /login", async ({
    page,
  }) => {
    const res = await page.goto("/studio/anything", { waitUntil: "load" });
    expect(page.url()).toContain("/login");
    expect(res?.status()).toBeLessThan(400);
  });

  test("viewer cannot access /studio", async ({ context, page }) => {
    await loginAs(context.request, "viewer");
    await page.goto("/studio/anything");
    expect(page.url()).toContain("/login");
  });

  test("anonymous POST /api/publish is rejected", async ({ request }) => {
    // Auth-first proxy: anonymous API hits get 401 (not signed in) rather
    // than 403 (signed in but lacks permission). Either response means
    // "you cannot publish" — assert it's a 4xx auth failure.
    const res = await request.post("/api/publish", {
      data: { slug: "x", draft: {} },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("editor POST /api/publish returns 403 (publisher only)", async ({
    request,
  }) => {
    await loginAs(request, "editor");
    const res = await request.post("/api/publish", {
      data: { slug: "x", draft: {} },
    });
    expect(res.status()).toBe(403);
  });
});
