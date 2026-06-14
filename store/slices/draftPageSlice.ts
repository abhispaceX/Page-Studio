import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import {
  sectionRegistry,
  type RegisteredSectionType,
} from "@/lib/sectionRegistry";
import type { Page, UnknownSectionEnvelope } from "@/lib/schema";

export interface DraftPageState {
  /**
   * Page being edited. `null` until the Studio dispatches `init` with a
   * page loaded from Contentful (or the persisted store rehydrates it).
   */
  page: Page | null;
  /** True when the draft has unsaved changes relative to the last init/save. */
  dirty: boolean;
  /** Epoch ms of the last `markSaved` action; null if never saved. */
  lastSavedAt: number | null;
}

const initialState: DraftPageState = {
  page: null,
  dirty: false,
  lastSavedAt: null,
};

interface AddSectionPayload {
  type: RegisteredSectionType;
  /** Optional explicit id; otherwise generated. */
  id?: string;
}

function makeId(type: string) {
  return `${type}-${Math.random().toString(36).slice(2, 8)}`;
}

const draftPageSlice = createSlice({
  name: "draftPage",
  initialState,
  reducers: {
    /**
     * Initialise (or replace) the editable page. Called once after server
     * fetch. Re-init for a different pageId resets dirty/lastSavedAt.
     */
    init(state, action: PayloadAction<Page>) {
      state.page = action.payload;
      state.dirty = false;
      state.lastSavedAt = null;
    },
    /** Clear the draft (e.g., after publish). */
    reset() {
      return initialState;
    },
    addSection(state, action: PayloadAction<AddSectionPayload>) {
      if (!state.page) return;
      const { type, id } = action.payload;
      const entry = sectionRegistry[type];
      const newSection = {
        id: id ?? makeId(type),
        type,
        props: { ...entry.defaultProps },
      } as unknown as Page["sections"][number];
      state.page.sections.push(newSection);
      state.dirty = true;
    },
    removeSection(state, action: PayloadAction<{ id: string }>) {
      if (!state.page) return;
      state.page.sections = state.page.sections.filter(
        (s) => s.id !== action.payload.id
      );
      state.dirty = true;
    },
    moveSection(
      state,
      action: PayloadAction<{ id: string; direction: "up" | "down" }>
    ) {
      if (!state.page) return;
      const list = state.page.sections;
      const idx = list.findIndex((s) => s.id === action.payload.id);
      if (idx === -1) return;
      const swap = action.payload.direction === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= list.length) return;
      [list[idx], list[swap]] = [list[swap], list[idx]];
      state.dirty = true;
    },
    reorderSections(
      state,
      action: PayloadAction<{ fromIndex: number; toIndex: number }>
    ) {
      if (!state.page) return;
      const { fromIndex, toIndex } = action.payload;
      const list = state.page.sections;
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= list.length ||
        toIndex >= list.length
      ) {
        return;
      }
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      state.dirty = true;
    },
    updateProps(
      state,
      action: PayloadAction<{
        id: string;
        props: Record<string, unknown>;
      }>
    ) {
      if (!state.page) return;
      const section = state.page.sections.find(
        (s) => s.id === action.payload.id
      );
      if (!section) return;
      // Merge so a partial prop edit (e.g., just `heading`) doesn't drop the rest.
      section.props = {
        ...(section.props as Record<string, unknown>),
        ...action.payload.props,
      } as typeof section.props;
      state.dirty = true;
    },
    updatePageMeta(
      state,
      action: PayloadAction<{ title?: string }>
    ) {
      if (!state.page) return;
      if (action.payload.title !== undefined) {
        state.page.title = action.payload.title;
        state.dirty = true;
      }
    },
    markSaved(state) {
      state.dirty = false;
      state.lastSavedAt = Date.now();
    },
  },
});

export const {
  init,
  reset,
  addSection,
  removeSection,
  moveSection,
  reorderSections,
  updateProps,
  updatePageMeta,
  markSaved,
} = draftPageSlice.actions;

export default draftPageSlice.reducer;

/**
 * View-helper: produce the loose envelope shape SectionRenderer expects.
 * Keeps the renderer agnostic to whether sections came from Contentful or Redux.
 */
export function asEnvelopes(page: Page): UnknownSectionEnvelope[] {
  return page.sections.map((s) => ({
    id: s.id,
    type: s.type,
    props: s.props as Record<string, unknown>,
  }));
}
