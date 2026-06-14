import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: baseURL,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      // Build/start need *something* in env for the lazy contentful readers
      // not to crash; test scenarios that need real Contentful are guarded
      // separately in tests/e2e/studio.spec.ts.
      CONTENTFUL_SPACE_ID: process.env.CONTENTFUL_SPACE_ID ?? "x",
      CONTENTFUL_DELIVERY_TOKEN: process.env.CONTENTFUL_DELIVERY_TOKEN ?? "x",
      CONTENTFUL_PREVIEW_TOKEN: process.env.CONTENTFUL_PREVIEW_TOKEN ?? "x",
      CONTENTFUL_MANAGEMENT_TOKEN: process.env.CONTENTFUL_MANAGEMENT_TOKEN ?? "x",
      CONTENTFUL_ENVIRONMENT: process.env.CONTENTFUL_ENVIRONMENT ?? "master",
      AUTH_COOKIE_SECRET: process.env.AUTH_COOKIE_SECRET ?? "test-secret-do-not-use",
    },
  },
});
