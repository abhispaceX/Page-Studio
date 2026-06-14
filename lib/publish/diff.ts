import { z, type ZodObject } from "zod";

import { sectionRegistry, isRegisteredSectionType } from "@/lib/sectionRegistry";
import type { Page, Section } from "@/lib/schema";

/**
 * SemVer bump levels, ordered. `none` means the two pages are deeply equal —
 * publish is idempotent in that case.
 */
export type Bump = "none" | "patch" | "minor" | "major";

export type ChangeKind =
  | "section.added"
  | "section.removed"
  | "section.typeChanged"
  | "section.moved"
  | "prop.added.optional"
  | "prop.added.required" // shouldn't normally happen client-side, but treat conservatively as minor
  | "prop.removed.optional"
  | "prop.removed.required"
  | "prop.valueChanged"
  | "page.titleChanged";

export interface Change {
  kind: ChangeKind;
  sectionId?: string;
  sectionType?: string;
  propPath?: string;
  /** Bump that this individual change contributes. The final bump is the max. */
  bump: Exclude<Bump, "none">;
  message: string;
}

export interface DiffResult {
  bump: Bump;
  changes: Change[];
}

const ORDER: Record<Bump, number> = {
  none: 0,
  patch: 1,
  minor: 2,
  major: 3,
};

function maxBump(a: Bump, b: Bump): Bump {
  return ORDER[a] >= ORDER[b] ? a : b;
}

/**
 * Look up the Zod schema for a section's props so we can decide whether a
 * given prop is required or optional. Unknown section types are treated as
 * "all props required" — conservative; encourages registering the type.
 */
function isPropOptional(sectionType: string, propKey: string): boolean {
  if (!isRegisteredSectionType(sectionType)) return false;
  const schema = sectionRegistry[sectionType].schema;
  if (!(schema instanceof z.ZodObject)) return false;
  const shape = (schema as ZodObject).shape as Record<string, z.ZodTypeAny>;
  const field = shape[propKey];
  if (!field) return true; // not in schema at all → treat as optional/extra
  // Zod 4: optional/nullable wrappers expose `.isOptional()`.
  return typeof field.isOptional === "function" && field.isOptional();
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== "object") return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function diffProps(
  sectionType: string,
  sectionId: string,
  prevProps: Record<string, unknown>,
  nextProps: Record<string, unknown>
): Change[] {
  const changes: Change[] = [];
  const keys = new Set([...Object.keys(prevProps), ...Object.keys(nextProps)]);

  for (const key of keys) {
    const inPrev = key in prevProps;
    const inNext = key in nextProps;

    if (inPrev && inNext) {
      if (!shallowEqual(prevProps[key], nextProps[key])) {
        changes.push({
          kind: "prop.valueChanged",
          sectionId,
          sectionType,
          propPath: key,
          bump: "patch",
          message: `${sectionType}#${sectionId}.${key} changed`,
        });
      }
    } else if (!inPrev && inNext) {
      const optional = isPropOptional(sectionType, key);
      changes.push({
        kind: optional ? "prop.added.optional" : "prop.added.required",
        sectionId,
        sectionType,
        propPath: key,
        bump: "minor", // adding a prop (optional or required at our boundary) is minor
        message: `${sectionType}#${sectionId}.${key} added`,
      });
    } else if (inPrev && !inNext) {
      const optional = isPropOptional(sectionType, key);
      changes.push({
        kind: optional ? "prop.removed.optional" : "prop.removed.required",
        sectionId,
        sectionType,
        propPath: key,
        bump: optional ? "patch" : "major",
        message: `${sectionType}#${sectionId}.${key} removed`,
      });
    }
  }
  return changes;
}

/**
 * Deterministic page-to-page diff. Pure: no I/O, stable output, safe to
 * unit-test.
 */
export function diffPages(prev: Page | null, next: Page): DiffResult {
  if (!prev) {
    // First-ever publish: treat as a no-op diff. `bumpVersion(initial, 'none')`
    // produces 1.0.0 in version.ts, which is the conventional first release.
    return { bump: "none", changes: [] };
  }

  const changes: Change[] = [];

  if (prev.title !== next.title) {
    changes.push({
      kind: "page.titleChanged",
      bump: "patch",
      message: `Page title changed: "${prev.title}" → "${next.title}"`,
    });
  }

  const prevById = new Map(prev.sections.map((s) => [s.id, s]));
  const nextById = new Map(next.sections.map((s) => [s.id, s]));

  // Removed sections
  for (const [id, sec] of prevById) {
    if (!nextById.has(id)) {
      changes.push({
        kind: "section.removed",
        sectionId: id,
        sectionType: sec.type,
        bump: "major",
        message: `Section removed: ${sec.type}#${id}`,
      });
    }
  }

  // Added / changed sections
  for (const [id, nextSec] of nextById) {
    const prevSec = prevById.get(id);
    if (!prevSec) {
      changes.push({
        kind: "section.added",
        sectionId: id,
        sectionType: nextSec.type,
        bump: "minor",
        message: `Section added: ${nextSec.type}#${id}`,
      });
      continue;
    }
    if (prevSec.type !== nextSec.type) {
      changes.push({
        kind: "section.typeChanged",
        sectionId: id,
        sectionType: nextSec.type,
        bump: "major",
        message: `Section type changed: ${prevSec.type} → ${nextSec.type} (id ${id})`,
      });
      // Still compare props below — major already dominates.
    }
    changes.push(
      ...diffProps(
        nextSec.type,
        id,
        prevSec.props as Record<string, unknown>,
        nextSec.props as Record<string, unknown>
      )
    );
  }

  // Reorder detection (kept as patch — order matters but isn't a contract break)
  const prevOrder = prev.sections.map((s) => s.id);
  const nextOrder = next.sections.map((s) => s.id);
  const commonInBoth = nextOrder.filter((id) => prevById.has(id));
  const prevCommonOrder = prevOrder.filter((id) => nextById.has(id));
  if (commonInBoth.join(",") !== prevCommonOrder.join(",")) {
    changes.push({
      kind: "section.moved",
      bump: "patch",
      message: "Section order changed",
    });
  }

  const bump = changes.reduce<Bump>(
    (acc, c) => maxBump(acc, c.bump),
    "none"
  );

  return { bump, changes };
}

/**
 * Deep equality used by the idempotency guard. JSON round-trip is sufficient
 * because Pages are JSON-serialisable by construction.
 */
export function pagesEqual(a: Page, b: Page): boolean {
  return JSON.stringify(canonicalise(a)) === JSON.stringify(canonicalise(b));
}

function canonicalise(p: Page): unknown {
  // Strip key ordering noise so JSON.stringify is stable.
  return {
    pageId: p.pageId,
    slug: p.slug,
    title: p.title,
    sections: p.sections.map((s) => ({
      id: s.id,
      type: s.type,
      props: sortObject(s.props as Record<string, unknown>),
    })),
  };
}

function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) out[k] = obj[k];
  return out;
}

// Re-export Section so unit tests don't need to import from @/lib/schema as well.
export type { Section };
