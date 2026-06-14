# Page Studio — Sprint Write-up

## Problem framing

Build a Page Studio that authorised users can use to load a page from
Contentful, edit it via a lightweight studio, preview the rendered output,
publish it as an immutable versioned release, and have all of that gated
by tests, accessibility checks, and CI. The brief was explicit about
architectural correctness and automation taking priority over UI polish.

## Key decisions and trade-offs

- **Single source of truth at the schema layer.** Section types live in
  `lib/schema/section.ts` as a Zod discriminated union; `sectionRegistry.ts`
  uses `satisfies Record<SectionType, …>` so removing a registry entry
  breaks the TypeScript build. The same renderer feeds `/preview` and the
  Studio's live preview — one code path, one validation surface.
- **Server-enforced RBAC, mock identity provider.** A signed (HMAC-SHA256)
  cookie carries `{ username, role }`. `proxy.ts` (Next 16's renamed
  Middleware) gates `/studio/*` and `/api/publish`; the publish route
  re-checks the session for defence in depth. I chose a hand-rolled cookie
  over NextAuth + OAuth because the RBAC bytecode is what matters here —
  the identity provider can be swapped without touching policy. ~1h saved
  for the publish + diff work.
- **Releases written to both filesystem and Contentful.** The brief's
  `releases/<slug>/<version>.json` is honored on disk for the dev loop
  and screen-recorded demo. A parallel `Release` entry in Contentful is
  the durable store the deployed Vercel app reads from, since Vercel's
  filesystem is read-only at runtime.
- **Idempotency via canonical-JSON equality** rather than hashing — pages
  are small JSON-serialisable objects, key-sorted before compare. Avoids a
  whole hash-collision worry and makes the unit tests trivially readable.
- **Up/down reorder, not drag-and-drop.** The brief says "reorder", and
  AAA-compliant DnD with keyboard-only reorder costs ~45m. Buttons satisfy
  both the functional spec and the a11y bar with one line of focus styling.

## Assumptions

- Contentful `Page.slug` is unique and globally identifies a page.
  `pageId` is aliased to `slug` in the adapter (`mappers.ts`). The brief's
  Page shape included `pageId` but the content model the user had already
  set up did not. Documented in README §3 so the trade-off is explicit.
- One Contentful environment per deployment (no per-request switching).
- Editors author rich section props (FeatureGrid items, Testimonial avatars)
  in Contentful itself; the Studio surfaces only the props the brief
  explicitly called out (Hero text, CTA label + URL) plus page title.
- Three pre-seeded users (`viewer`, `editor`, `publisher`) are sufficient
  to demonstrate RBAC; production would plug in a real IdP.

## What is not included and why

- **Drag-and-drop reorder.** Out of scope; up/down buttons satisfy the spec.
- **Image upload from Studio.** Out of scope; URLs come from Contentful.
- **Live `Release` listing / rollback UI.** The publish endpoint returns
  the new version + changelog; viewing history would need an additional
  route. Snapshot files are durable in Contentful so rollback is a
  spreadsheet-level operation today, not a UI one.
- **A `Release` content type seed migration.** The reader builds the
  content model in Contentful by hand (instructions in README §3). Could
  be automated with the CMA but adds setup friction.
- **Per-section prop editor for FeatureGrid items and Testimonial avatars.**
  Brief only requires Hero text + CTA label/URL.
- **Edge runtime for Proxy.** Next 16 dropped edge support for Proxy; this
  is a Next-side limitation, not a deliberate choice. RBAC runs on Node.
- **One axe `serious` violation** (`scrollable-region-focusable` on `/`)
  is unfixed. Not critical per the brief's CI gate; flagged here for
  honesty and slated for a follow-up.

## Architecture overview

```
Browser ─▶ /preview/[slug] ─▶ contentfulClient ─▶ SectionRenderer
                                                  │
                                                  └ Zod schema per section
                                                    + UnsupportedSection
                                                    + ErrorBoundary

Browser ─▶ /studio/[slug] (proxy: editor+) ─▶ initialPage
                                                  │
                                                  ▼
                                          Redux (draftPage/ui/publish)
                                                  │
                                          redux-persist ─▶ localStorage
                                                  │
                                                  ▼
                                          LivePreview (same SectionRenderer)
                                                  │
PublishBar ─▶ POST /api/publish (proxy: publisher) ─▶ publish/index.ts
                                                  │
                                  diff ─▶ bumpVersion ─▶ writeLocalSnapshot
                                                  │
                                                  └ createReleaseEntry (CMA)
```

## Redux slice responsibilities

- **`draftPage`** — the editable Page plus `dirty` and `lastSavedAt`.
  Reducers: `init`, `reset`, `addSection`, `removeSection`, `moveSection`,
  `updateProps`, `updatePageMeta`, `markSaved`. The only slice persisted
  to localStorage — drafts survive reloads.
- **`ui`** — `selectedSectionId`, cookie-mirrored `role`, toast queue.
  Ephemeral.
- **`publish`** — `status`, `lastResult`, `error`. Owned by the
  `publishDraft` async thunk.

## Contentful model and adapter

`Page` (slug, title, sections JSON) is what the reader already had.
`Release` (pageSlug, version, snapshot JSON, changelog, publishedAt) is
the durable store of immutable releases. The adapter (`lib/contentful/`)
isolates all Contentful imports; UI code consumes domain types only.
Draft vs published toggles via the adapter's `{ preview }` option, fed by
Next 16's async `draftMode()`.

## Publish and SemVer logic

Pure diff (`lib/publish/diff.ts`) walks both pages by section id:

- text/prop change → patch
- new section / new prop → minor
- removed section / type change / removed required prop → major

`bumpVersion` applies the highest bump. The orchestrator
(`lib/publish/index.ts`) is idempotent: same draft → same version,
no new snapshot written. Local FS and Contentful are written in that
order so the local file is durable even if CMA hiccups. 12 unit tests
exercise the diff and idempotency contracts.

## Accessibility approach

WCAG 2.2 AAA-oriented:

- Global 3px high-contrast `:focus-visible` ring; never display:none.
- Skip link as the first body element.
- `prefers-reduced-motion` honoured globally (all transitions/animations
  reduced to ~0ms).
- Single `<h1>` per page, sections use `<h2>`, cards `<h3>`.
- All inputs have labels; required fields use `aria-required` + visible `*`.
- Toasts in an `aria-live="polite"` region; error toasts get `role="alert"`.
- Muted text colours tuned past the AAA 7:1 contrast threshold.
- axe runs in CI against `/`, `/login`, and `/preview/fixture` via
  `@axe-core/playwright`. The report is uploaded as an artefact and the
  build fails on any `critical` violation.
