import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { Role } from "@/lib/auth/roles";

export interface UiState {
  /** ID of the section selected in the Studio sidebar, if any. */
  selectedSectionId: string | null;
  /** Role mirrored from the session cookie. UI uses this to hide controls. */
  role: Role | null;
  /** Toast messages for transient feedback (publish success, errors). */
  toasts: Array<{ id: string; level: "info" | "error" | "success"; message: string }>;
}

const initialState: UiState = {
  selectedSectionId: null,
  role: null,
  toasts: [],
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    selectSection(state, action: PayloadAction<string | null>) {
      state.selectedSectionId = action.payload;
    },
    setRole(state, action: PayloadAction<Role | null>) {
      state.role = action.payload;
    },
    pushToast(
      state,
      action: PayloadAction<{ level: "info" | "error" | "success"; message: string }>
    ) {
      state.toasts.push({
        id: Math.random().toString(36).slice(2, 9),
        ...action.payload,
      });
    },
    dismissToast(state, action: PayloadAction<{ id: string }>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload.id);
    },
  },
});

export const { selectSection, setRole, pushToast, dismissToast } = uiSlice.actions;
export default uiSlice.reducer;
