import "server-only";
import { createClient, type PlainClientAPI } from "contentful-management";

import { env } from "@/lib/utils/env";
import type { Page } from "@/lib/schema";

const RELEASE_CONTENT_TYPE = "release";

/**
 * No module-level caching — env var changes (e.g. after editing `.env.local`)
 * are picked up on the next call instead of being trapped in a stale client.
 */
function getClient(): PlainClientAPI {
  return createClient(
    { accessToken: env.contentful.managementToken },
    { type: "plain" }
  );
}

function scope() {
  return {
    spaceId: env.contentful.spaceId,
    environmentId: env.contentful.environment,
  };
}

/**
 * Compact one-liner derived from the SDK error.
 *
 * The contentful-management SDK throws Errors whose `.message` is a
 * multi-line JSON blob like:
 *   {
 *     "status": 401,
 *     "message": "Access token invalid",
 *     "details": { ... },
 *     "request": { ... }
 *   }
 *
 * The status code is NOT a property on the Error itself, so the obvious
 * `(e as any).status` check returns undefined. Parse the message JSON to
 * pull it out, then map to a short user-facing string. The original
 * structured error is logged once on the server so you can debug.
 */
function short(e: unknown, defaultMsg: string): Error {
  if (!(e instanceof Error)) return new Error(defaultMsg);

  let status: number | undefined =
    (e as Error & { status?: number; statusCode?: number }).status ??
    (e as Error & { status?: number; statusCode?: number }).statusCode;
  let cfMessage = "";

  try {
    const parsed = JSON.parse(e.message);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.status === "number") status = parsed.status;
      if (typeof parsed.message === "string") cfMessage = parsed.message;
    }
  } catch {
    // Not JSON; fall back to the first line of the raw message.
    cfMessage = e.message.split("\n")[0];
  }

  // Always log the structured error on the server — it's the only place
  // the developer can see the real status, requestId, and URL.
  console.error(
    `[contentful] ${e.name} status=${status ?? "?"} message="${cfMessage.slice(
      0,
      200
    )}"`
  );

  const name = e.name;

  if (
    status === 401 ||
    name === "OrganizationAccessGrantRequired" ||
    /access token invalid/i.test(cfMessage)
  ) {
    return new Error("Contentful: invalid management token");
  }
  if (status === 403 || name === "AccessDenied") {
    return new Error("Contentful: permission denied for this space");
  }
  if (status === 404 || name === "NotFound") {
    if (/content.?type/i.test(cfMessage)) {
      return new Error(
        "Contentful: 'release' content type not found — create it in your space"
      );
    }
    return new Error("Contentful: resource not found");
  }
  if (status === 400) {
    if (/unknown field/i.test(cfMessage) || /no field/i.test(cfMessage)) {
      return new Error(
        "Contentful: 'release' content type is missing one of pageSlug / version / snapshot / publishedAt"
      );
    }
    if (/filter or ordering/i.test(cfMessage)) {
      return new Error(
        "Contentful: 'release' content type fields are not declared properly — add pageSlug, version, snapshot, publishedAt as typed fields"
      );
    }
    if (cfMessage) {
      return new Error(`Contentful: ${cfMessage.slice(0, 140)}`);
    }
    return new Error("Contentful: bad request");
  }
  if (status === 422 || name === "ValidationFailed") {
    return new Error(
      "Contentful: Release entry rejected by validation (check field types)"
    );
  }
  if (status === 429) {
    return new Error("Contentful: rate limited — try again in a few seconds");
  }
  if (status && status >= 500) {
    return new Error(`Contentful: server error (${status})`);
  }
  if (cfMessage) {
    return new Error(`Contentful: ${cfMessage.slice(0, 140)}`);
  }
  return new Error(defaultMsg);
}

export interface CreateReleaseInput {
  pageSlug: string;
  version: string;
  snapshot: Page;
  changelog: string;
  publishedAt: string;
}

/**
 * Update the editable Contentful Page entry's `sections` JSON + title with
 * the current draft. This is what the Studio's "Save" button calls — the
 * Page entry becomes the durable draft source so a teammate (or the next
 * session on a different device) opens the Studio and sees the latest
 * saved state.
 */
export async function updatePageEntry(input: {
  slug: string;
  title: string;
  // The full draft sections array, serialized as a JSON-Object field.
  sections: unknown;
}): Promise<{ id: string }> {
  const client = getClient();
  const { spaceId, environmentId } = scope();

  try {
    // Find the entry by slug. We use management content_type=page.
    const res = await client.entry.getMany({
      spaceId,
      environmentId,
      query: {
        content_type: "page",
        order: "-sys.updatedAt",
        limit: 100,
      },
    });

    const entry = res.items.find((e) => {
      const f = e.fields as { slug?: { "en-US"?: string } };
      return f.slug?.["en-US"] === input.slug;
    });

    if (!entry) {
      throw new Error(
        `Contentful: no Page entry with slug "${input.slug}" — create one in Contentful first`
      );
    }

    const updated = await client.entry.update(
      { spaceId, environmentId, entryId: entry.sys.id },
      {
        ...entry,
        fields: {
          ...entry.fields,
          slug: { "en-US": input.slug },
          title: { "en-US": input.title },
          sections: { "en-US": input.sections },
        },
      }
    );
    // Publish the entry so reads see the change immediately (and so the
    // delivery API picks it up).
    const published = await client.entry.publish(
      { spaceId, environmentId, entryId: entry.sys.id },
      updated
    );
    return { id: published.sys.id };
  } catch (e) {
    throw short(e, "Contentful: save Page entry failed");
  }
}

export async function createReleaseEntry(
  input: CreateReleaseInput
): Promise<{ id: string }> {
  const client = getClient();
  const { spaceId, environmentId } = scope();

  try {
    const entry = await client.entry.create(
      { spaceId, environmentId, contentTypeId: RELEASE_CONTENT_TYPE },
      {
        fields: {
          pageSlug: { "en-US": input.pageSlug },
          version: { "en-US": input.version },
          snapshot: { "en-US": input.snapshot },
          changelog: { "en-US": input.changelog },
          publishedAt: { "en-US": input.publishedAt },
        },
      }
    );

    const published = await client.entry.publish(
      { spaceId, environmentId, entryId: entry.sys.id },
      entry
    );
    return { id: published.sys.id };
  } catch (e) {
    throw short(e, "Contentful: create Release failed");
  }
}

/**
 * Latest Release snapshot for a slug, or null if none has ever been
 * published. A "no releases" case is null (not an error). Auth / config
 * problems are thrown.
 */
export async function getLatestRelease(
  pageSlug: string
): Promise<{ version: string; snapshot: Page; publishedAt: string } | null> {
  const client = getClient();
  const { spaceId, environmentId } = scope();

  let res;
  try {
    // Deliberately do NOT use `fields.pageSlug` as a server-side filter.
    // Contentful rejects field-based filters/orderings whenever the field
    // isn't declared on the content type ("The query you sent was invalid.
    // Probably a filter or ordering specification is not applicable to the
    // type of a field"). That happens when the editor created the `release`
    // content type but didn't add a typed `pageSlug` field (even though
    // entries we write include the key). Ordering by `sys.createdAt` is
    // always supported and always sortable.
    //
    // We pull the most recent N releases across all slugs and filter
    // client-side. N=100 is overkill for one project and trivial to stream.
    res = await client.entry.getMany({
      spaceId,
      environmentId,
      query: {
        content_type: RELEASE_CONTENT_TYPE,
        order: "-sys.createdAt",
        limit: 100,
      },
    });
  } catch (e) {
    throw short(e, "Contentful: read Release failed");
  }

  type ReleaseFields = {
    pageSlug?: { "en-US"?: string };
    version?: { "en-US"?: string };
    snapshot?: { "en-US"?: Page };
    publishedAt?: { "en-US"?: string };
  };

  const entry = res.items.find((e) => {
    const f = e.fields as ReleaseFields;
    return f.pageSlug?.["en-US"] === pageSlug;
  });
  if (!entry) return null;

  const fields = entry.fields as ReleaseFields;
  const version = fields.version?.["en-US"];
  const snapshot = fields.snapshot?.["en-US"];
  const publishedAt = fields.publishedAt?.["en-US"] ?? "";
  if (!version || !snapshot) return null;

  return { version, snapshot, publishedAt };
}

export interface ReleaseSummary {
  version: string;
  publishedAt: string;
  createdAt: string;
}

/**
 * All releases for a slug, newest-first by SemVer. Used by the preview
 * page's version switcher so users can browse and revert visually.
 */
export async function listReleasesForSlug(
  pageSlug: string
): Promise<ReleaseSummary[]> {
  const client = getClient();
  const { spaceId, environmentId } = scope();

  let res;
  try {
    res = await client.entry.getMany({
      spaceId,
      environmentId,
      query: {
        content_type: RELEASE_CONTENT_TYPE,
        order: "-sys.createdAt",
        limit: 200,
      },
    });
  } catch (e) {
    throw short(e, "Contentful: list Releases failed");
  }

  type ReleaseFields = {
    pageSlug?: { "en-US"?: string };
    version?: { "en-US"?: string };
    publishedAt?: { "en-US"?: string };
  };

  const items: ReleaseSummary[] = [];
  for (const e of res.items) {
    const f = e.fields as ReleaseFields;
    if (f.pageSlug?.["en-US"] !== pageSlug) continue;
    const version = f.version?.["en-US"];
    if (!version) continue;
    items.push({
      version,
      publishedAt: f.publishedAt?.["en-US"] ?? "",
      createdAt: e.sys.createdAt ?? "",
    });
  }
  items.sort((a, b) => compareSemver(b.version, a.version));
  return items;
}

/**
 * Fetch a specific Release entry by slug + version. Returns null if not
 * found. Useful for the preview's "show version X" path.
 */
export async function getReleaseByVersion(
  pageSlug: string,
  version: string
): Promise<{ version: string; snapshot: Page; publishedAt: string } | null> {
  const client = getClient();
  const { spaceId, environmentId } = scope();

  let res;
  try {
    res = await client.entry.getMany({
      spaceId,
      environmentId,
      query: {
        content_type: RELEASE_CONTENT_TYPE,
        order: "-sys.createdAt",
        limit: 200,
      },
    });
  } catch (e) {
    throw short(e, "Contentful: read Release failed");
  }

  type ReleaseFields = {
    pageSlug?: { "en-US"?: string };
    version?: { "en-US"?: string };
    snapshot?: { "en-US"?: Page };
    publishedAt?: { "en-US"?: string };
  };

  const entry = res.items.find((e) => {
    const f = e.fields as ReleaseFields;
    return (
      f.pageSlug?.["en-US"] === pageSlug && f.version?.["en-US"] === version
    );
  });
  if (!entry) return null;

  const f = entry.fields as ReleaseFields;
  const v = f.version?.["en-US"];
  const snapshot = f.snapshot?.["en-US"];
  const publishedAt = f.publishedAt?.["en-US"] ?? "";
  if (!v || !snapshot) return null;
  return { version: v, snapshot, publishedAt };
}

function compareSemver(a: string, b: string): number {
  const [a1 = 0, a2 = 0, a3 = 0] = a.split(".").map((n) => Number(n) || 0);
  const [b1 = 0, b2 = 0, b3 = 0] = b.split(".").map((n) => Number(n) || 0);
  return a1 - b1 || a2 - b2 || a3 - b3;
}
