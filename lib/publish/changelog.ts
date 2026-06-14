import type { Change } from "./diff";

/**
 * Format a list of changes as a small Markdown summary. Order is preserved
 * from the diff so output is deterministic per (prev, next) pair.
 */
export function formatChangelog(version: string, changes: Change[]): string {
  if (changes.length === 0) {
    return `## v${version}\n\n_No changes detected._\n`;
  }
  const lines = changes.map((c) => `- **${c.bump}** — ${c.message}`);
  return `## v${version}\n\n${lines.join("\n")}\n`;
}
