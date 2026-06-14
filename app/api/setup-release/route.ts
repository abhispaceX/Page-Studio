import { NextResponse } from "next/server";
import { createClient } from "contentful-management";

import { env } from "@/lib/utils/env";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

/**
 * One-shot helper: creates the `release` content type in the current
 * Contentful space if it isn't already there, with the typed fields the
 * publish flow expects. Idempotent — calling it again when the content
 * type exists is a no-op.
 *
 * Gated to the `publisher` role: writing to Contentful's content model is
 * effectively schema migration.
 */
export async function POST() {
  const session = await getSession();
  if (!can(session?.role, "publish")) {
    return NextResponse.json(
      { error: "Publisher role required" },
      { status: 403 }
    );
  }

  let client;
  try {
    client = createClient(
      { accessToken: env.contentful.managementToken },
      { type: "plain" }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "CMA client init failed" },
      { status: 500 }
    );
  }

  const scope = {
    spaceId: env.contentful.spaceId,
    environmentId: env.contentful.environment,
  };
  const contentTypeId = "release";

  // Is it already there?
  try {
    const existing = await client.contentType.get({
      ...scope,
      contentTypeId,
    });
    const declaredFields = new Set(existing.fields.map((f) => f.id));
    const missing = ["pageSlug", "version", "snapshot", "changelog", "publishedAt"]
      .filter((id) => !declaredFields.has(id));

    if (missing.length === 0) {
      return NextResponse.json({
        ok: true,
        action: "noop",
        message: "Release content type already configured.",
      });
    }
    return NextResponse.json(
      {
        ok: false,
        action: "incomplete",
        message: `Release content type exists but is missing fields: ${missing.join(
          ", "
        )}. Add them in Contentful with these exact IDs, or delete the content type and call this endpoint again.`,
      },
      { status: 409 }
    );
  } catch {
    // Not found → proceed to create.
  }

  try {
    const created = await client.contentType.createWithId(
      { ...scope, contentTypeId },
      {
        name: "Release",
        description: "Immutable versioned snapshot of a Page",
        displayField: "version",
        fields: [
          {
            id: "pageSlug",
            name: "Page slug",
            type: "Symbol",
            required: true,
            localized: false,
          },
          {
            id: "version",
            name: "Version",
            type: "Symbol",
            required: true,
            localized: false,
          },
          {
            id: "snapshot",
            name: "Snapshot",
            type: "Object",
            required: true,
            localized: false,
          },
          {
            id: "changelog",
            name: "Changelog",
            type: "Text",
            required: false,
            localized: false,
          },
          {
            id: "publishedAt",
            name: "Published at",
            type: "Date",
            required: false,
            localized: false,
          },
        ],
      }
    );

    // Activate the content type so entries can be written against it.
    await client.contentType.publish(
      { ...scope, contentTypeId },
      created
    );

    return NextResponse.json({
      ok: true,
      action: "created",
      message: "Release content type created and published.",
    });
  } catch (e) {
    let msg = e instanceof Error ? e.message : "Unknown error";
    // Compact the typical multi-line JSON error from the SDK.
    try {
      const parsed = JSON.parse(msg);
      if (parsed?.message) msg = String(parsed.message);
    } catch {
      // ignore
    }
    return NextResponse.json(
      { error: msg.split("\n")[0].slice(0, 200) },
      { status: 500 }
    );
  }
}
