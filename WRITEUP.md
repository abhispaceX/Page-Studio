# Page Studio — Sprint Write-up

## Problem framing

Build a Page Studio that authorised users can use to load a page from
Contentful, edit it via a lightweight WYSIWYG-lite studio, preview the
rendered output, publish it as an immutable versioned release, and gate
the whole thing with tests, accessibility checks, and CI. The brief
explicitly prioritised architecture, correctness, and automation over
UI polish — UI was to follow from Tailwind + shadcn defaults.

## Key decisions and trade-offs

- **Single source of truth at the schema layer.** Section types live in
  `lib/schema/section.ts` as a Zod discriminated union; `sectionRegistry.ts`
  uses `satisfies Record<SectionType, …>` so removing a registry entry
  breaks the TypeScript build. The same `SectionRenderer` is used by
  `/preview/[slug]` and the Studio's live preview — one validation
  surface, one rendering path.
- **Auth-first proxy.** Any URL except `/login` and the public demo
  fixture redirects anonymous visitors to `/login?next=…`. `/studio/*`
  additionally requires the `edit` action; `/api/publish` requires
  `publish`. The proxy runs on the network boundary; every route handler
  re-checks the session for defence in depth. Mock identity provider
  (signed HMAC cookie + three seeded users) — RBAC enforcement is real;
  the IDP is swappable.
- **Lenient Contentful adapter.** Editors hand-author the sections JSON
  in Contentful. The adapter unwraps the common
  `{ sections: [...] }` envelope, aliases common prop names
  (`title → heading`, `buttonText → ctaLabel`, etc), and drops malformed
  sections individually instead of failing the page. Schema strictness
  stays at the renderer — invalid data renders an inline notice or a
  graceful fallback, but never crashes.
- **Contentful as source of truth for versioned state.** The orchestrator
  reads "latest release" from Contentful only — never from the local FS.
  Local `releases/<slug>/<version>.json` is written as a dev archive for
  the screen-recorded demo; on Vercel (read-only filesystem) the FS
  write is a no-op and the Contentful Release entry is the durable
  record.
- **Idempotent publish.** Canonical-JSON equality between the draft and
  the latest snapshot short-circuits to the existing version with
  `idempotent: true` — same draft never cuts a duplicate release.
- **Drag-and-drop with keyboard parity.** `dnd-kit` instead of arrow
  buttons — accessible via `KeyboardSensor` + `sortableKeyboardCoordinates`
  out of the box, plus built-in screen-reader announcements. Worth the
  ~45m budget.
- **Explicit Save + Publish, not auto-save UX.** localStorage persistence
  stays for reload safety, but the visible action is two buttons: **Save
  changes** writes the draft back to the Contentful Page entry (CMA);
  **Publish release** cuts a new Release. Editors see exactly what they
  did and when.
- **Self-healing setup.** First publish in a fresh space auto-creates the
  `release` content type via CMA (`ensureReleaseContentType`) — editor
  doesn't have to script content-model migrations by hand.

## Assumptions

- Contentful `Page.slug` is unique and globally identifies a page. The
  brief's `pageId` is aliased to `slug` in the adapter (`mappers.ts`) —
  no separate field is required in Contentful.
- One Contentful environment per deployment. The adapter is structured
  to accept per-call overrides but no UI wires it.
- Three pre-seeded users (`viewer`, `editor`, `publisher`) suffice to
  demonstrate the RBAC contract. Production would plug in a real IDP
  without touching the policy matrix.
- Editors author rich-detail props (FeatureGrid items, Testimonial
  avatars) in Contentful directly. The in-app Studio surfaces only the
  props called out by the brief (Hero text, CTA label + URL) plus page
  title.

## What is not included and why

- **Image upload from Studio.** Out of scope; image URLs come from
  Contentful.
- **Live "Releases" list with rollback UI.** The preview's version
  switcher reads and renders any historical Release, but there is no
  "promote vN.M.K to latest" action. Rollback would require either a
  Contentful entry reordering or republishing an old snapshot as the
  new version — both are one server action away when needed.
- **Real OAuth identity provider.** Mock cookie keeps the auth seam
  meaningful while saving the budget for the publish/version work.
- **Edge runtime for Proxy.** Next 16 dropped edge support for the
  renamed Proxy file; this is a framework constraint, not a deliberate
  choice. RBAC runs on Node.
- **A `serious` axe finding** (`scrollable-region-focusable` on `/`)
  remains. Below the brief's critical threshold; triaged for a follow-up.

## Architecture overview

```
Anonymous browser ─▶ proxy.ts ─▶ /login (every path except /login + /preview/fixture)

Signed-in browser ─▶ /preview/[slug] (RSC)
                     ├─ getLatestRelease()                ─▶ Contentful CMA
                     └─ SectionRenderer
                        ├─ Zod schema per section
                        ├─ UnsupportedSection fallback
                        └─ SectionErrorBoundary

Editor/publisher ─▶  /studio/[slug] (RSC + Redux client)
                     ├─ initial: latest Release || Page entry
                     ├─ Redux: draftPage / ui / publish
                     ├─ redux-persist → localStorage
                     └─ LivePreview reuses SectionRenderer

PublishBar Save  ─▶ POST /api/save-draft (editor+)  ─▶ updatePageEntry (CMA)
PublishBar Pub.  ─▶ POST /api/publish (publisher)   ─▶ publish/index.ts
                                                       ├─ ensureReleaseContentType
                                                       ├─ getLatestRelease
                                                       ├─ diffPages → bumpVersion
                                                       ├─ writeLocalSnapshot (dev only)
                                                       └─ createReleaseEntry (CMA)
```

## Redux slice responsibilities

- **`draftPage`** — the editable Page (`pageId`, `slug`, `title`,
  `sections[]`) plus `dirty` and `lastSavedAt`. Reducers: `init`,
  `reset`, `addSection`, `removeSection`, `moveSection`,
  `reorderSections`, `updateProps`, `updatePageMeta`, `markSaved`. Every
  Studio edit goes through these; no component-local state holds draft
  content. **The only slice persisted to localStorage.**
- **`ui`** — `selectedSectionId`, role mirrored from the session cookie
  (UI controls only), toast queue. Ephemeral.
- **`publish`** — `status` (`idle`/`publishing`/`succeeded`/`failed`),
  `lastResult` (`version`, `changes`, `changelog`, `idempotent`), plus a
  parallel `saveStatus`, `saveError`, `lastSavedAt` driven by the
  `saveDraft` thunk. Drives Save/Publish toasts and the bottom-bar pill.

## Contentful model and adapter

Two content types are required in the space:

| Content type | Fields                                                     |
|--------------|------------------------------------------------------------|
| `Page`       | `slug` (Short text), `title` (Short text), `sections` (JSON object) |
| `Release`    | `pageSlug`, `version` (Short text), `snapshot` (JSON), `changelog` (Long text), `publishedAt` (Date) |

The `Release` content type is auto-provisioned by
`ensureReleaseContentType()` on the first publish if missing — editors
don't have to set it up manually.

`lib/contentful/contentfulClient.ts` exposes `getPage(slug, { preview })`
and `listPages()` against CDA / CPA. `managementClient.ts` exposes
`createReleaseEntry`, `getLatestRelease`, `getReleaseByVersion`,
`listReleasesForSlug`, and `updatePageEntry`. `mappers.ts` normalises
editor-authored shapes before they hit the schema.

UI code never imports from `contentful` or `contentful-management` — the
adapter boundary is strict and grep-verified.

## Publish and SemVer logic

`lib/publish/diff.ts` is a pure function. Walks both Pages keyed by
section id:

- Text/prop value change, title change, or reorder → **patch**
- Section added; new prop appeared → **minor**
- Section removed, section type changed, required prop removed → **major**

`bumpVersion` applies the highest bump. The orchestrator
(`lib/publish/index.ts`):

1. Validates the draft with `PageSchema`.
2. Calls `ensureReleaseContentType()`.
3. Reads the latest Release for the slug from Contentful.
4. **Idempotency check** — canonical-JSON equality with the latest
   snapshot returns the existing version untouched.
5. Computes the diff, bumps the version.
6. Writes `releases/<slug>/<version>.json` locally (skipped on
   serverless), then publishes a new `Release` entry to Contentful.
7. Returns `{ version, changes[], changelog, idempotent }`.

The `/preview/[slug]` route reads via `getLatestRelease()` (or
`getReleaseByVersion()` when a `?v=` query is present) and exposes a
**version switcher** dropdown — every historical Release becomes
viewable; an amber "Viewing older release" banner replaces the green
"Live release" pill when you're not on the latest.

## Accessibility approach

WCAG 2.2 AAA-oriented:

- Global 3px high-contrast `:focus-visible` ring; never display:none.
- Skip link as the first element after `<body>`.
- `prefers-reduced-motion` honoured globally — all transitions and
  animations reduced to ~0ms when set.
- One `<h1>` per page route; sections use `<h2>`, cards `<h3>`.
- All inputs have `<Label htmlFor>`; required fields advertise
  `aria-required` and a visible `*`.
- Validation errors in `role="alert"` regions; toasts in
  `aria-live="polite"` with `role="alert"` for the error level.
- Drag-and-drop via dnd-kit ships with a `KeyboardSensor` and screen
  reader announcements out of the box — sections are reorderable with
  arrow keys alone.
- Muted text contrasts tuned past AAA's 7:1 threshold.

**Automated evidence**: `tests/e2e/a11y.spec.ts` runs `@axe-core/playwright`
across `/`, `/login`, and `/preview/fixture` with the WCAG 2A/AA, 2.1
A/AA, and 2.2 AA tag sets. Results are written to `a11y-report.json` at
the repo root, uploaded as a CI artefact, and the run fails on **any
`critical` violation**. Current state: **zero critical violations** on
all three surfaces.
