import type { Bump } from "./diff";

export const INITIAL_VERSION = "1.0.0";

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseVersion(v: string): ParsedVersion {
  const m = VERSION_RE.exec(v);
  if (!m) throw new Error(`Invalid version: ${v}`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

export function formatVersion(p: ParsedVersion): string {
  return `${p.major}.${p.minor}.${p.patch}`;
}

/**
 * Apply a bump to a SemVer string. `none` returns the current version
 * unchanged (idempotent publish). A `null`/undefined current version means
 * this is the first release — returns INITIAL_VERSION regardless of bump.
 */
export function bumpVersion(current: string | null | undefined, bump: Bump): string {
  if (!current) return INITIAL_VERSION;
  const p = parseVersion(current);
  switch (bump) {
    case "none":
      return current;
    case "patch":
      return formatVersion({ ...p, patch: p.patch + 1 });
    case "minor":
      return formatVersion({ major: p.major, minor: p.minor + 1, patch: 0 });
    case "major":
      return formatVersion({ major: p.major + 1, minor: 0, patch: 0 });
  }
}
