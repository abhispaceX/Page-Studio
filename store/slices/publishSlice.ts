import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import type { Page } from "@/lib/schema";

export type PublishStatus =
  | "idle"
  | "publishing"
  | "succeeded"
  | "failed";

export type SaveStatus = "idle" | "saving" | "saved" | "failed";

export interface PublishResult {
  version: string;
  changes: string[];
  changelog: string;
  idempotent: boolean;
}

export interface PublishState {
  status: PublishStatus;
  lastResult: PublishResult | null;
  error: string | null;
  saveStatus: SaveStatus;
  saveError: string | null;
  lastSavedAt: number | null;
}

const initialState: PublishState = {
  status: "idle",
  lastResult: null,
  error: null,
  saveStatus: "idle",
  saveError: null,
  lastSavedAt: null,
};

/**
 * POST the current draft to /api/publish. RBAC is enforced server-side;
 * a 403 here means the cookie role isn't `publisher`.
 */
export const publishDraft = createAsyncThunk<
  PublishResult,
  { slug: string; draft: Page },
  { rejectValue: string }
>("publish/publishDraft", async ({ slug, draft }, { rejectWithValue }) => {
  const res = await fetch("/api/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, draft }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    const message =
      body.error?.split("\n")[0].slice(0, 240) ??
      `Publish failed (${res.status})`;
    return rejectWithValue(message);
  }
  return (await res.json()) as PublishResult;
});

export const saveDraft = createAsyncThunk<
  { savedAt: string },
  { slug: string; draft: Page },
  { rejectValue: string }
>("publish/saveDraft", async ({ slug, draft }, { rejectWithValue }) => {
  const res = await fetch("/api/save-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, draft }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    const message =
      body.error?.split("\n")[0].slice(0, 240) ??
      `Save failed (${res.status})`;
    return rejectWithValue(message);
  }
  return (await res.json()) as { savedAt: string };
});

const publishSlice = createSlice({
  name: "publish",
  initialState,
  reducers: {
    clear(state) {
      state.status = "idle";
      state.error = null;
    },
    clearSave(state) {
      state.saveStatus = "idle";
      state.saveError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(publishDraft.pending, (state) => {
        state.status = "publishing";
        state.error = null;
      })
      .addCase(
        publishDraft.fulfilled,
        (state, action: PayloadAction<PublishResult>) => {
          state.status = "succeeded";
          state.lastResult = action.payload;
        }
      )
      .addCase(publishDraft.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? action.error.message ?? "Publish failed";
      })
      .addCase(saveDraft.pending, (state) => {
        state.saveStatus = "saving";
        state.saveError = null;
      })
      .addCase(
        saveDraft.fulfilled,
        (state, action: PayloadAction<{ savedAt: string }>) => {
          state.saveStatus = "saved";
          state.lastSavedAt = new Date(action.payload.savedAt).getTime();
        }
      )
      .addCase(saveDraft.rejected, (state, action) => {
        state.saveStatus = "failed";
        state.saveError =
          action.payload ?? action.error.message ?? "Save failed";
      });
  },
});

export const { clear, clearSave } = publishSlice.actions;
export default publishSlice.reducer;
