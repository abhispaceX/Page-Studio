import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

import type { Page } from "@/lib/schema";

const RELEASES_ROOT = path.join(process.cwd(), "releases");

function slugDir(slug: string): string {
  return path.join(RELEASES_ROOT, slug);
}

function snapshotPath(slug: string, version: string): string {
  return path.join(slugDir(slug), `${version}.json`);
}

export interface SnapshotFile {
  version: string;
  publishedAt: string;
  snapshot: Page;
  changelog: string;
}

/**
 * True when running inside a serverless host with a read-only function
 * filesystem (Vercel, AWS Lambda, etc). Local FS writes are a no-op there;
 * Contentful is the only durable source of releases in prod.
 */
function isServerlessReadOnly(): boolean {
  return (
    !!process.env.VERCEL ||
    !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
    !!process.env.LAMBDA_TASK_ROOT
  );
}

/**
 * Write the immutable snapshot to disk. Used for the local dev loop and the
 * screen-recorded demo — gives reviewers a real `releases/<slug>/<version>.json`
 * tree to look at. On serverless hosts the filesystem is read-only, so the
 * write is skipped silently and the Contentful Release entry is the only
 * place a snapshot lives.
 *
 * Writes are skipped (not overwritten) if the file already exists — releases
 * are immutable by contract.
 */
export async function writeLocalSnapshot(
  slug: string,
  payload: SnapshotFile
): Promise<{ path: string | null; written: boolean; skipped?: "read-only-fs" }> {
  if (isServerlessReadOnly()) {
    return { path: null, written: false, skipped: "read-only-fs" };
  }

  try {
    await fs.mkdir(slugDir(slug), { recursive: true });
  } catch (e) {
    // Treat any filesystem error as "no local cache available"; Contentful
    // is still the source of truth. Surface to the dev console but never
    // throw — the publish must not fail because of a local cache miss.
    console.warn(
      `[snapshot] Skipping local write for ${slug} — ${
        e instanceof Error ? e.message : "filesystem error"
      }`
    );
    return { path: null, written: false, skipped: "read-only-fs" };
  }

  const file = snapshotPath(slug, payload.version);
  try {
    await fs.access(file);
    return { path: file, written: false };
  } catch {
    // file does not exist → write
  }
  try {
    await fs.writeFile(file, JSON.stringify(payload, null, 2), { flag: "wx" });
    return { path: file, written: true };
  } catch (e) {
    console.warn(
      `[snapshot] Local write failed for ${slug}@${payload.version} — ${
        e instanceof Error ? e.message : "filesystem error"
      }`
    );
    return { path: null, written: false, skipped: "read-only-fs" };
  }
}

/**
 * Read latest local snapshot for a slug by sorting versions in SemVer order.
 * Returns null if no local snapshots exist.
 */
export async function readLatestLocalSnapshot(
  slug: string
): Promise<SnapshotFile | null> {
  let files: string[];
  try {
    files = await fs.readdir(slugDir(slug));
  } catch {
    return null;
  }
  const versions = files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter((v) => /^\d+\.\d+\.\d+$/.test(v))
    .sort(compareSemver);
  const latest = versions[versions.length - 1];
  if (!latest) return null;
  const raw = await fs.readFile(snapshotPath(slug, latest), "utf8");
  return JSON.parse(raw) as SnapshotFile;
}

function compareSemver(a: string, b: string): number {
  const [aa, ab, ac] = a.split(".").map(Number);
  const [ba, bb, bc] = b.split(".").map(Number);
  return aa - ba || ab - bb || ac - bc;
}
