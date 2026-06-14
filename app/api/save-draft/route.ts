import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { updatePageEntry } from "@/lib/contentful/managementClient";
import { PageSchema } from "@/lib/schema";

/**
 * Save the Studio draft back to the Contentful Page entry. Distinct from
 * publish: this updates the editable draft (the Page content type), not the
 * immutable Release. Editor role is sufficient.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!can(session?.role, "edit")) {
    return NextResponse.json({ error: "Editor role required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug =
    typeof body === "object" && body !== null
      ? (body as { slug?: unknown }).slug
      : undefined;
  const draft =
    typeof body === "object" && body !== null
      ? (body as { draft?: unknown }).draft
      : undefined;

  if (typeof slug !== "string" || !slug.trim()) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const parsed = PageSchema.safeParse(draft);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: `Invalid draft: ${first.path.join(".") || "(root)"} ${first.message}`,
      },
      { status: 422 }
    );
  }

  try {
    await updatePageEntry({
      slug: parsed.data.slug,
      title: parsed.data.title,
      sections: parsed.data.sections,
    });
    return NextResponse.json({
      ok: true,
      savedAt: new Date().toISOString(),
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Save failed";
    const message = raw.split("\n")[0].slice(0, 240);
    console.error("[POST /api/save-draft]", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
