import "server-only";

import type { Page } from "@/lib/schema";
import { PageSchema } from "@/lib/schema";

import { diffPages, pagesEqual } from "./diff";
import { bumpVersion } from "./version";
import { formatChangelog } from "./changelog";
import { writeLocalSnapshot, type SnapshotFile } from "./snapshot";
import { ensureReleaseContentType } from "@/lib/contentful/ensureReleaseContentType";
import {
  createReleaseEntry,
  getLatestRelease,
} from "@/lib/contentful/managementClient";

export interface PublishOutcome {
  version: string;
  changes: string[];
  changelog: string;
  /** True when the draft equalled the latest release → no new version cut. */
  idempotent: boolean;
}

/**
 * Resolve "what is the current latest release for this slug?"
 *
 * Contentful is the single source of truth for versioned state. We don't
 * fall back to the local FS for the diff — that would let two devs disagree
 * on what "the latest" is, and would make publishes succeed locally while
 * silently drifting from prod.
 *
 * The FS snapshot is still written (immutable archive, per brief), but it
 * is never used for read-side decisions.
 */
async function resolveLatest(
  slug: string
): Promise<{ version: string; snapshot: Page } | null> {
  const remote = await getLatestRelease(slug);
  if (!remote) return null;
  return { version: remote.version, snapshot: remote.snapshot };
}

/**
 * Idempotent publish orchestrator.
 *
 * 1. Validate the draft (defense in depth — server actions are RBAC-gated but
 *    not type-gated).
 * 2. Find the latest existing release (Contentful, fallback to local FS).
 * 3. If the draft equals the latest release snapshot → return that version
 *    with `idempotent: true`. No new entry is written.
 * 4. Otherwise compute a deterministic diff, choose the SemVer bump, and:
 *    - Write `releases/<slug>/<version>.json` (immutable on disk)
 *    - Create a published `Release` entry in Contentful
 * 5. Return the new version + changelog.
 */
export async function publish(
  slug: string,
  draftInput: unknown
): Promise<PublishOutcome> {
  const draft = PageSchema.parse(draftInput);
  if (draft.slug !== slug) {
    throw new Error(
      `Draft slug "${draft.slug}" does not match request slug "${slug}"`
    );
  }

  // Make sure the `release` content type is present and complete in
  // Contentful before we try to use it. First publish in a fresh space
  // creates and activates it; subsequent calls are in-process no-ops.
  await ensureReleaseContentType();

  const latest = await resolveLatest(slug);

  if (latest && pagesEqual(latest.snapshot, draft)) {
    return {
      version: latest.version,
      changes: [],
      changelog: formatChangelog(latest.version, []),
      idempotent: true,
    };
  }

  const { bump, changes } = diffPages(latest?.snapshot ?? null, draft);
  // First publish ever: bump === "none" but we still need to ship 1.0.0.
  const nextVersion = latest ? bumpVersion(latest.version, bump) : bumpVersion(null, bump);

  // bumpVersion(currentVersion, 'none') returns the same version — meaning
  // there are no observable diffs but the snapshot somehow differs (key
  // ordering, etc.). Re-equality-check defensively so we don't overwrite.
  if (latest && nextVersion === latest.version) {
    return {
      version: latest.version,
      changes: [],
      changelog: formatChangelog(latest.version, []),
      idempotent: true,
    };
  }

  const publishedAt = new Date().toISOString();
  const changelog = formatChangelog(nextVersion, changes);

  const snapshotFile: SnapshotFile = {
    version: nextVersion,
    publishedAt,
    snapshot: draft,
    changelog,
  };

  // Write FS first — it's local and fast; failure surfaces before we call CMA.
  await writeLocalSnapshot(slug, snapshotFile);

  // Then mirror to Contentful so the deployed app sees it.
  try {
    await createReleaseEntry({
      pageSlug: slug,
      version: nextVersion,
      snapshot: draft,
      changelog,
      publishedAt,
    });
  } catch (e) {
    // Local snapshot is on disk for forensics; surface the short reason.
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error(`[publish] createReleaseEntry failed: ${msg}`);
    throw new Error(msg);
  }

  return {
    version: nextVersion,
    changes: changes.map((c) => c.message),
    changelog,
    idempotent: false,
  };
}
