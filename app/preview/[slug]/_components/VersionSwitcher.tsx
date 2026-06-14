"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  Clock,
  History,
  Tag,
} from "lucide-react";

import type { ReleaseSummary } from "@/lib/contentful/managementClient";

interface Props {
  slug: string;
  current: string | null;
  releases: ReleaseSummary[];
  publishedAt: string;
}

export function VersionSwitcher({ slug, current, releases, publishedAt }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Close on outside click + Escape
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (releases.length === 0) return null;

  const isLatest = current === null || current === releases[0]?.version;
  const formatDate = (iso: string) =>
    iso ? new Date(iso).toLocaleString() : "—";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100"
      >
        <Tag className="h-3 w-3" aria-hidden />
        v{current ?? releases[0].version}
        {isLatest ? (
          <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-900">
            latest
          </span>
        ) : null}
        <span aria-hidden className="text-emerald-700/70">
          ·
        </span>
        <Calendar className="h-3 w-3" aria-hidden />
        <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
        <ChevronDown className="h-3 w-3" aria-hidden />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Release versions"
          className="absolute right-0 z-40 mt-2 max-h-80 w-72 overflow-y-auto rounded-xl border bg-card p-1 shadow-xl"
        >
          <div className="flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <History className="h-3 w-3" aria-hidden />
              Release history
            </span>
            <span>{releases.length}</span>
          </div>
          <ul className="space-y-0.5">
            {releases.map((r, idx) => {
              const isCurrent = (current ?? releases[0].version) === r.version;
              const isLatestEntry = idx === 0;
              const href =
                idx === 0
                  ? `/preview/${slug}`
                  : `/preview/${slug}?v=${encodeURIComponent(r.version)}`;
              return (
                <li key={r.version}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    onClick={() => {
                      setOpen(false);
                      router.push(href);
                      router.refresh();
                    }}
                    className={
                      "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors " +
                      (isCurrent
                        ? "bg-violet-50 ring-1 ring-violet-200"
                        : "hover:bg-accent")
                    }
                  >
                    <span
                      aria-hidden
                      className={
                        "mt-0.5 grid h-7 w-7 place-items-center rounded-md " +
                        (isCurrent
                          ? "bg-violet-200 text-violet-800"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      <Tag className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">
                          v{r.version}
                        </span>
                        {isLatestEntry ? (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                            latest
                          </span>
                        ) : null}
                        {isCurrent && !isLatestEntry ? (
                          <span className="rounded bg-violet-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-800">
                            viewing
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" aria-hidden />
                        {formatDate(r.publishedAt || r.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {current && current !== releases[0].version ? (
            <div className="border-t px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(`/preview/${slug}`);
                  router.refresh();
                }}
                className="w-full rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
              >
                Back to latest (v{releases[0].version})
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
