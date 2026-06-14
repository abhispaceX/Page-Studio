import { notFound, redirect } from "next/navigation";

import { getPage } from "@/lib/contentful/contentfulClient";
import { getLatestRelease } from "@/lib/contentful/managementClient";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { PageSchema, type Page } from "@/lib/schema";

import { StudioClient } from "./StudioClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export default async function StudioPage({ params }: { params: Params }) {
  const { slug } = await params;

  const session = await getSession();
  if (!can(session?.role, "edit")) {
    redirect(`/login?next=/studio/${encodeURIComponent(slug)}`);
  }

  let initial: Page | null = null;
  let source: "release" | "contentful-page" = "contentful-page";
  let initialVersion: string | null = null;

  try {
    const release = await getLatestRelease(slug);
    if (release) {
      const parsed = PageSchema.safeParse(release.snapshot);
      if (parsed.success) {
        initial = parsed.data;
        source = "release";
        initialVersion = release.version;
      }
    }
  } catch {
    // CMA unavailable / content type missing — fall through to the Page entry.
  }

  if (!initial) {
    const raw = await getPage(slug, { preview: true });
    if (!raw) notFound();
    const parsedPage = PageSchema.safeParse(raw);
    initial = parsedPage.success
      ? parsedPage.data
      : { pageId: raw.pageId, slug: raw.slug, title: raw.title, sections: [] };
    source = "contentful-page";
  }

  return (
    <StudioClient
      initialPage={initial}
      role={session?.role ?? null}
      source={source}
      initialVersion={initialVersion}
    />
  );
}
