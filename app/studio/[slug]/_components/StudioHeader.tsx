"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, FileText, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { init } from "@/store/slices/draftPageSlice";
import { pushToast } from "@/store/slices/uiSlice";
import type { Page } from "@/lib/schema";

interface Props {
  initialPage: Page;
  source: "release" | "contentful-page";
  initialVersion: string | null;
}

export function StudioHeader({ initialPage, source, initialVersion }: Props) {
  const dispatch = useAppDispatch();
  const dirty = useAppSelector((s) => s.draftPage.dirty);
  const draftPageId = useAppSelector((s) => s.draftPage.page?.pageId);
  const draftTitle = useAppSelector((s) => s.draftPage.page?.title);

  const onReset = () => {
    if (
      dirty &&
      !window.confirm(
        "Discard unsaved local edits and reload this page from Contentful?"
      )
    ) {
      return;
    }
    dispatch(init(initialPage));
    dispatch(
      pushToast({
        level: "info",
        message:
          source === "release"
            ? `Reloaded from Release v${initialVersion}.`
            : "Reloaded from Contentful Page entry.",
      })
    );
  };

  const stale = draftPageId && draftPageId !== initialPage.pageId;
  const displayTitle = draftTitle ?? initialPage.title;

  return (
    <header className="flex items-center justify-between gap-4 border-b bg-card/90 px-5 py-3 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          aria-label="Back to pages"
          className="grid h-9 w-9 place-items-center rounded-md border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight">
            {displayTitle}
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs text-muted-foreground">
              /{initialPage.slug}
            </span>
            <SourceBadge
              source={source}
              version={initialVersion}
              stale={!!stale}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          title="Discard local edits and reload from Contentful"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Reload from Contentful
        </Button>
      </div>
    </header>
  );
}

function SourceBadge({
  source,
  version,
  stale,
}: {
  source: "release" | "contentful-page";
  version: string | null;
  stale: boolean;
}) {
  if (stale) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
        ⚠ Local draft is for a different page
      </span>
    );
  }
  if (source === "release") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-900">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        From Release v{version}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-900">
      <FileText className="h-3 w-3" aria-hidden />
      From Contentful draft
    </span>
  );
}
