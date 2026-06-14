"use client";

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";

import draftPageReducer from "./slices/draftPageSlice";
import uiReducer from "./slices/uiSlice";
import publishReducer from "./slices/publishSlice";

// redux-persist requires localStorage; on the server we need a noop so the
// store can be constructed without crashing during SSR.
import type { WebStorage } from "redux-persist/es/types";

function createNoopStorage(): WebStorage {
  return {
    getItem: () => Promise.resolve(null),
    setItem: () => Promise.resolve(),
    removeItem: () => Promise.resolve(),
  };
}

// Eagerly bind the storage at module load; redux-persist will request it
// during PERSIST/REHYDRATE actions, which fire client-side only.
const storage =
  typeof window !== "undefined"
    ? // Dynamically required so SSR bundles never touch the browser-only impl.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require("redux-persist/lib/storage").default as WebStorage)
    : createNoopStorage();

const rootReducer = combineReducers({
  draftPage: draftPageReducer,
  ui: uiReducer,
  publish: publishReducer,
});

const persistedReducer = persistReducer(
  {
    key: "cms-builder",
    version: 1,
    storage,
    // Only the draft survives reloads — UI state and publish results are
    // ephemeral by design.
    whitelist: ["draftPage"],
  },
  rootReducer
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist dispatches these non-serializable actions internally.
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
