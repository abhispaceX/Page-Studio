"use client";

import * as React from "react";
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  Lock,
  Rocket,
  Save,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { markSaved } from "@/store/slices/draftPageSlice";
import {
  clear,
  clearSave,
  publishDraft,
  saveDraft,
} from "@/store/slices/publishSlice";
import { pushToast } from "@/store/slices/uiSlice";
import { can } from "@/lib/auth/roles";

export function PublishBar() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.ui.role);
  const page = useAppSelector((s) => s.draftPage.page);
  const dirty = useAppSelector((s) => s.draftPage.dirty);
  const status = useAppSelector((s) => s.publish.status);
  const lastResult = useAppSelector((s) => s.publish.lastResult);
  const error = useAppSelector((s) => s.publish.error);
  const saveStatus = useAppSelector((s) => s.publish.saveStatus);
  const saveError = useAppSelector((s) => s.publish.saveError);
  const lastSavedAt = useAppSelector((s) => s.publish.lastSavedAt);

  if (!page) return null;

  const canEdit = can(role, "edit");
  const canPublish = can(role, "publish");
  const publishing = status === "publishing";
  const saving = saveStatus === "saving";

  const onSave = async () => {
    if (!page) return;
    const result = await dispatch(saveDraft({ slug: page.slug, draft: page }));
    if (saveDraft.fulfilled.match(result)) {
      dispatch(markSaved());
      dispatch(
        pushToast({
          level: "success",
          message: "Saved to Contentful.",
        })
      );
    } else {
      dispatch(
        pushToast({
          level: "error",
          message: (result.payload as string) ?? "Save failed.",
        })
      );
    }
  };

  const onPublish = async () => {
    if (!page) return;
    const result = await dispatch(publishDraft({ slug: page.slug, draft: page }));
    if (publishDraft.fulfilled.match(result)) {
      dispatch(markSaved());
      dispatch(
        pushToast({
          level: result.payload.idempotent ? "info" : "success",
          message: result.payload.idempotent
            ? `No changes — still at v${result.payload.version}.`
            : `Published v${result.payload.version}.`,
        })
      );
    } else {
      dispatch(
        pushToast({
          level: "error",
          message: (result.payload as string) ?? "Publish failed.",
        })
      );
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 border-t bg-card/95 px-5 py-3 backdrop-blur">
      <div className="flex flex-1 items-center gap-3 text-sm">
        <StatusPill
          dirty={dirty}
          saving={saving}
          savedAt={lastSavedAt}
        />
        {lastResult ? (
          <span className="hidden items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs text-violet-900 sm:inline-flex">
            <Rocket className="h-3 w-3" aria-hidden />
            Last release{" "}
            <span className="font-mono font-semibold">v{lastResult.version}</span>
          </span>
        ) : null}
        {error || saveError ? (
          <span
            role="alert"
            className="inline-flex items-center gap-1.5 text-destructive"
          >
            <CircleAlert className="h-4 w-4" aria-hidden />
            {error || saveError}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {error || saveError ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              dispatch(clear());
              dispatch(clearSave());
            }}
          >
            Dismiss
          </Button>
        ) : null}
        <Button
          variant="outline"
          onClick={onSave}
          disabled={!canEdit || saving || (!dirty && saveStatus !== "failed")}
          aria-disabled={!canEdit || saving}
          title={!canEdit ? "Editor role required" : "Save draft to Contentful"}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </Button>
        {!canPublish ? (
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Publisher required
          </span>
        ) : null}
        <Button
          onClick={onPublish}
          disabled={!canPublish || publishing}
          aria-disabled={!canPublish || publishing}
          title={
            !canPublish ? "Only the publisher role can publish" : undefined
          }
        >
          {publishing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Rocket className="h-4 w-4" aria-hidden />
          )}
          {publishing ? "Publishing…" : "Publish release"}
        </Button>
      </div>
    </div>
  );
}

function StatusPill({
  dirty,
  saving,
  savedAt,
}: {
  dirty: boolean;
  saving: boolean;
  savedAt: number | null;
}) {
  if (saving) {
    return (
      <span
        aria-live="polite"
        className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-900"
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Saving…
      </span>
    );
  }
  if (dirty) {
    return (
      <span
        aria-live="polite"
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900"
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500"
        />
        Unsaved changes
      </span>
    );
  }
  return (
    <span
      aria-live="polite"
      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900"
    >
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
      {savedAt ? "All changes saved" : "Up to date"}
    </span>
  );
}
