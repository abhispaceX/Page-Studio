"use client";

import * as React from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { init } from "@/store/slices/draftPageSlice";
import { setRole, dismissToast } from "@/store/slices/uiSlice";
import type { Page } from "@/lib/schema";
import type { Role } from "@/lib/auth/roles";

import { SectionList } from "./_components/SectionList";
import { PropEditor } from "./_components/PropEditor";
import { LivePreview } from "./_components/LivePreview";
import { PublishBar } from "./_components/PublishBar";
import { StudioHeader } from "./_components/StudioHeader";

interface Props {
  initialPage: Page;
  role: Role | null;
  source: "release" | "contentful-page";
  initialVersion: string | null;
}

export function StudioClient({
  initialPage,
  role,
  source,
  initialVersion,
}: Props) {
  const dispatch = useAppDispatch();
  const current = useAppSelector((s) => s.draftPage.page);
  const toasts = useAppSelector((s) => s.ui.toasts);

  React.useEffect(() => {
    // Initialise when:
    //   - there's no persisted draft, or
    //   - the persisted draft belongs to a different pageId (different slug).
    // We do NOT auto-reset on every revisit because that would clobber
    // in-progress edits; the StudioHeader exposes an explicit "Reload from
    // Contentful" button for that.
    if (!current || current.pageId !== initialPage.pageId) {
      dispatch(init(initialPage));
    }
  }, [dispatch, current, initialPage]);

  React.useEffect(() => {
    dispatch(setRole(role));
  }, [dispatch, role]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <StudioHeader
        initialPage={initialPage}
        source={source}
        initialVersion={initialVersion}
      />
      <div
        className="grid min-h-0 flex-1 overflow-hidden"
        style={{
          gridTemplateColumns: "minmax(260px, 300px) 1fr minmax(300px, 360px)",
        }}
      >
        <SectionList />
        <LivePreview />
        <PropEditor />
      </div>
      <PublishBar />

      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-20 right-4 flex w-80 flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.level === "error" ? "alert" : undefined}
            className={
              "pointer-events-auto rounded-md border p-3 text-sm shadow-md " +
              (t.level === "error"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : t.level === "success"
                  ? "border-emerald-500/40 bg-emerald-50 text-emerald-900"
                  : "border-muted bg-card")
            }
          >
            <div className="flex items-start justify-between gap-2">
              <span>{t.message}</span>
              <button
                type="button"
                onClick={() => dispatch(dismissToast({ id: t.id }))}
                aria-label="Dismiss notification"
                className="text-xs underline-offset-2 hover:underline"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
