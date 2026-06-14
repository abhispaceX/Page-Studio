import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { ensureReleaseContentType } from "@/lib/contentful/ensureReleaseContentType";

/**
 * One-shot helper for editors who want to provision the `release` content
 * type by hand. The publish flow also calls `ensureReleaseContentType()`,
 * so this endpoint is largely a convenience.
 *
 * All Contentful logic lives in the adapter (`lib/contentful/`); this route
 * just gates by role and delegates.
 */
export async function POST() {
  const session = await getSession();
  if (!can(session?.role, "publish")) {
    return NextResponse.json(
      { error: "Publisher role required" },
      { status: 403 }
    );
  }

  try {
    const action = await ensureReleaseContentType();
    return NextResponse.json({
      ok: true,
      action,
      message:
        action === "created"
          ? "Release content type created and published."
          : "Release content type already configured.",
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Setup failed";
    const message = raw.split("\n")[0].slice(0, 240);
    console.error("[POST /api/setup-release]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
