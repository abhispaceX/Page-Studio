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
 * Write the immutable snapshot to disk. Local file storage works for
 * development and the screen-recorded demo; in production on Vercel, the
 * Contentful Release entry written alongside this is the durable source.
 *
 * Writes are skipped (not overwritten) if the file already exists — releases
 * are immutable by contract.
 */
export async function writeLocalSnapshot(
  slug: string,
  payload: SnapshotFile
): Promise<{ path: string; written: boolean }> {
  await fs.mkdir(slugDir(slug), { recursive: true });
  const file = snapshotPath(slug, payload.version);
  try {
    await fs.access(file);
    return { path: file, written: false };
  } catch {
    // file does not exist → write
  }
  await fs.writeFile(file, JSON.stringify(payload, null, 2), { flag: "wx" });
  return { path: file, written: true };
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
