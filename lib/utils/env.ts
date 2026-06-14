/**
 * Server-only env reader. Throws at call time if a required var is missing —
 * never silently degrades. Client code must not import this file.
 */

function require(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optional(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v : fallback;
}

export const env = {
  contentful: {
    get spaceId() {
      return require("CONTENTFUL_SPACE_ID");
    },
    get environment() {
      return optional("CONTENTFUL_ENVIRONMENT", "master")!;
    },
    get deliveryToken() {
      return require("CONTENTFUL_DELIVERY_TOKEN");
    },
    get previewToken() {
      return require("CONTENTFUL_PREVIEW_TOKEN");
    },
    get managementToken() {
      return require("CONTENTFUL_MANAGEMENT_TOKEN");
    },
  },
  auth: {
    get cookieSecret() {
      return require("AUTH_COOKIE_SECRET");
    },
  },
};
