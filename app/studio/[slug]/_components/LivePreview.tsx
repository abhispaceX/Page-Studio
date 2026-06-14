"use client";

import Link from "next/link";
import { ExternalLink, Monitor } from "lucide-react";

import { SectionRenderer } from "@/components/SectionRenderer";
import { useAppSelector } from "@/store/hooks";
import { asEnvelopes } from "@/store/slices/draftPageSlice";

export function LivePreview() {
  const page = useAppSelector((s) => s.draftPage.page);

  if (!page) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-sm text-muted-foreground">
        No draft loaded.
      </div>
    );
  }

  const envelopes = asEnvelopes(page);

  return (
    <div className="flex h-full flex-col bg-muted/40">
      <div className="flex items-center justify-between gap-3 border-b bg-card px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <Monitor className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span className="font-medium">Live preview</span>
          <span className="font-mono text-xs text-muted-foreground">
            /{page.slug}
          </span>
        </div>
        <Link
          href={`/preview/${page.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
        >
          Open full preview
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto bg-background">
        <h1 className="sr-only">{page.title}</h1>
        <SectionRenderer sections={envelopes} />
      </div>
    </div>
  );
}
