import "server-only";
import { createClient, type PlainClientAPI } from "contentful-management";

import { env } from "@/lib/utils/env";

const CONTENT_TYPE_ID = "release";

const REQUIRED_FIELDS = [
  {
    id: "pageSlug",
    name: "Page slug",
    type: "Symbol" as const,
    required: true,
    localized: false,
  },
  {
    id: "version",
    name: "Version",
    type: "Symbol" as const,
    required: true,
    localized: false,
  },
  {
    id: "snapshot",
    name: "Snapshot",
    type: "Object" as const,
    required: true,
    localized: false,
  },
  {
    id: "changelog",
    name: "Changelog",
    type: "Text" as const,
    required: false,
    localized: false,
  },
  {
    id: "publishedAt",
    name: "Published at",
    type: "Date" as const,
    required: false,
    localized: false,
  },
];

let cachedReady: boolean | null = null;

/**
 * Idempotent: makes sure the `release` content type exists in the configured
 * Contentful space with the fields the publish flow needs. Safe to call on
 * every publish — after the first successful call we remember in-process
 * that the content type is ready and skip the round-trip.
 *
 * Throws a short message on failure; callers should propagate.
 */
export async function ensureReleaseContentType(): Promise<
  "ready" | "created"
> {
  if (cachedReady) return "ready";

  const client: PlainClientAPI = createClient(
    { accessToken: env.contentful.managementToken },
    { type: "plain" }
  );
  const scope = {
    spaceId: env.contentful.spaceId,
    environmentId: env.contentful.environment,
  };

  // 1. Check if it's already there.
  try {
    const existing = await client.contentType.get({
      ...scope,
      contentTypeId: CONTENT_TYPE_ID,
    });
    const declared = new Set(existing.fields.map((f) => f.id));
    const missing = REQUIRED_FIELDS.filter((f) => !declared.has(f.id));
    if (missing.length === 0) {
      cachedReady = true;
      return "ready";
    }
    // Patch the missing fields onto the existing content type rather than
    // throwing — the editor probably created the content type by hand and
    // forgot one or two fields.
    const patched = {
      name: existing.name ?? "Release",
      description:
        existing.description ?? "Immutable versioned snapshot of a Page",
      displayField: existing.displayField ?? "version",
      fields: [
        ...existing.fields,
        ...missing.map((f) => ({ ...f, omitted: false, disabled: false })),
      ],
    };
    const updated = await client.contentType.update(
      { ...scope, contentTypeId: CONTENT_TYPE_ID },
      { ...patched, sys: existing.sys }
    );
    await client.contentType.publish(
      { ...scope, contentTypeId: CONTENT_TYPE_ID },
      updated
    );
    cachedReady = true;
    return "created";
  } catch (e) {
    // Treat "not found" as "we need to create it". Anything else (401/403)
    // bubbles up.
    if (!isNotFound(e)) {
      throw e;
    }
  }

  // 2. Create from scratch.
  const created = await client.contentType.createWithId(
    { ...scope, contentTypeId: CONTENT_TYPE_ID },
    {
      name: "Release",
      description: "Immutable versioned snapshot of a Page",
      displayField: "version",
      fields: REQUIRED_FIELDS,
    }
  );
  await client.contentType.publish(
    { ...scope, contentTypeId: CONTENT_TYPE_ID },
    created
  );
  cachedReady = true;
  return "created";
}

function isNotFound(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  if (e.name === "NotFound") return true;
  try {
    const parsed = JSON.parse(e.message);
    return parsed?.status === 404;
  } catch {
    return /\b404\b/.test(e.message) || /not\s*found/i.test(e.message);
  }
}
