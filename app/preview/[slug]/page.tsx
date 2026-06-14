import Link from "next/link";
import type { Metadata } from "next";

import { getPage } from "@/lib/contentful/contentfulClient";
import {
  getLatestRelease,
  getReleaseByVersion,
  listReleasesForSlug,
  type ReleaseSummary,
} from "@/lib/contentful/managementClient";
import { SectionRenderer } from "@/components/SectionRenderer";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UnknownSectionEnvelope } from "@/lib/schema";
import { VersionSwitcher } from "./_components/VersionSwitcher";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type Search = Promise<{ v?: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}): Promise<Metadata> {
  const { slug } = await params;
  const { v } = await searchParams;
  try {
    const release = v
      ? await getReleaseByVersion(slug, v)
      : await getLatestRelease(slug);
    if (release) {
      return { title: `${release.snapshot.title} · v${release.version}` };
    }
    const page = await getPage(slug);
    return { title: page?.title ?? "Preview" };
  } catch {
    return { title: "Preview" };
  }
}

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { slug } = await params;
  const { v } = await searchParams;

  let releases: ReleaseSummary[] = [];
  let releaseError: string | null = null;
  try {
    releases = await listReleasesForSlug(slug);
  } catch (e) {
    releaseError = e instanceof Error ? e.message : "Contentful error";
  }

  let release: Awaited<ReturnType<typeof getLatestRelease>> = null;
  if (releases.length > 0) {
    try {
      release = v
        ? await getReleaseByVersion(slug, v)
        : await getLatestRelease(slug);
    } catch (e) {
      releaseError = e instanceof Error ? e.message : "Contentful error";
    }
  }

  if (release) {
    const sections = release.snapshot.sections.map((s) => ({
      id: s.id,
      type: s.type,
      props: s.props as Record<string, unknown>,
    })) as UnknownSectionEnvelope[];

    return (
      <main id="main" className="flex-1">
        <PreviewBar
          slug={slug}
          current={release.version}
          releases={releases}
          publishedAt={release.publishedAt}
        />
        <SectionErrorBoundary>
          <SectionRenderer sections={sections} />
        </SectionErrorBoundary>
      </main>
    );
  }

  // Asked for a specific version that doesn't exist
  if (v) {
    return (
      <main id="main" className="mx-auto max-w-xl flex-1 px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Version v{v} not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No release with that version exists for{" "}
          <code className="font-mono">/{slug}</code>.
        </p>
        <div className="mt-6">
          <Link
            href={`/preview/${slug}`}
            className={cn(buttonVariants())}
          >
            Show latest
          </Link>
        </div>
      </main>
    );
  }

  // No releases at all — fall back to Contentful Page entry so brand-new
  // slugs aren't blank.
  let fallback;
  try {
    fallback = await getPage(slug);
  } catch (e) {
    return (
      <main
        id="main"
        className="mx-auto max-w-2xl px-6 py-24 text-center"
        role="alert"
      >
        <h1 className="text-2xl font-semibold">Preview unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {e instanceof Error ? e.message : "Contentful error"}
        </p>
      </main>
    );
  }

  if (!fallback) {
    return <NotFoundView slug={slug} releaseError={releaseError} />;
  }

  return (
    <main id="main" className="flex-1">
      <UnpublishedBanner slug={slug} releaseError={releaseError} />
      <SectionErrorBoundary>
        <SectionRenderer sections={fallback.sections} />
      </SectionErrorBoundary>
    </main>
  );
}

function PreviewBar({
  slug,
  current,
  releases,
  publishedAt,
}: {
  slug: string;
  current: string;
  releases: ReleaseSummary[];
  publishedAt: string;
}) {
  const isLatest = releases[0]?.version === current;
  return (
    <div
      role="status"
      className={
        "sticky top-14 z-20 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2 backdrop-blur " +
        (isLatest
          ? "border-emerald-200 bg-emerald-50/90"
          : "border-amber-200 bg-amber-50/90")
      }
    >
      <div className="flex items-center gap-2 text-xs">
        <span
          className={
            "font-semibold uppercase tracking-wider " +
            (isLatest ? "text-emerald-900" : "text-amber-900")
          }
        >
          {isLatest ? "Live release" : "Viewing older release"}
        </span>
        {!isLatest ? (
          <Link
            href={`/preview/${slug}`}
            className="text-amber-900 underline underline-offset-2 hover:no-underline"
          >
            Back to latest
          </Link>
        ) : null}
      </div>
      <VersionSwitcher
        slug={slug}
        current={current}
        releases={releases}
        publishedAt={publishedAt}
      />
    </div>
  );
}

function UnpublishedBanner({
  slug,
  releaseError,
}: {
  slug: string;
  releaseError: string | null;
}) {
  return (
    <div
      role="status"
      className="sticky top-14 z-20 border-b border-amber-200 bg-amber-50/90 px-4 py-2 text-center text-xs font-medium text-amber-900 backdrop-blur"
    >
      Showing Contentful draft — nothing has been published yet.{" "}
      <Link
        href={`/studio/${slug}`}
        className="underline underline-offset-2 hover:no-underline"
      >
        Open in Studio
      </Link>
      {releaseError ? (
        <span className="ml-2 text-amber-700">({releaseError})</span>
      ) : null}
    </div>
  );
}

function NotFoundView({
  slug,
  releaseError,
}: {
  slug: string;
  releaseError: string | null;
}) {
  return (
    <main
      id="main"
      className="mx-auto flex max-w-xl flex-1 flex-col justify-center px-6 py-24 text-center"
    >
      <h1 className="text-3xl font-semibold tracking-tight">Nothing here yet</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        No release and no Contentful Page entry for{" "}
        <code className="font-mono">/{slug}</code>.
      </p>
      {releaseError ? (
        <p className="mt-2 text-xs text-muted-foreground">({releaseError})</p>
      ) : null}
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
          Back to pages
        </Link>
        <Link href={`/studio/${slug}`} className={cn(buttonVariants())}>
          Open Studio
        </Link>
      </div>
    </main>
  );
}
