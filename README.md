# Page Studio

A schema-driven landing-page builder backed by Contentful, with a
Redux-powered WYSIWYG-lite Studio, role-based access control, deterministic
SemVer publishing, and an accessibility-first UI targeted at WCAG 2.2 AAA.

Built for the Engineering Sprint Brief. Stack:

| Concern             | Choice                                          |
|---------------------|-------------------------------------------------|
| Framework           | Next.js 16.2 (App Router, Turbopack default)    |
| Language            | TypeScript                                      |
| State               | Redux Toolkit + redux-persist (localStorage)    |
| CMS                 | Contentful (CDA + CPA + CMA)                    |
| UI                  | Tailwind v4 + shadcn-style primitives           |
| Validation          | Zod                                             |
| Tests               | Vitest (unit), Playwright + axe (e2e + a11y)    |
| CI                  | GitHub Actions                                  |
| Deploy              | Vercel                                          |

---

## 1. Architecture overview

Three runtime paths share a single schema layer.

```
┌──────────────┐    ┌──────────────────────┐    ┌────────────────────────┐
│   /preview   │──→ │  contentfulClient    │──→ │  SectionRenderer (RSC) │
└──────────────┘    │  (CDA + CPA adapter) │    │  Zod-validates each    │
                    └──────────────────────┘    │  section, dispatches   │
                                                │  via sectionRegistry.  │
                                                │  Unknown / invalid →   │
                                                │  graceful fallback.    │
                                                └────────────────────────┘

┌──────────────┐    ┌────────────────────┐    ┌────────────────────────┐
│   /studio    │──→ │  Redux Toolkit     │←─→ │  LivePreview = same    │
│  (RSC shell) │    │  draftPage / ui /  │    │  SectionRenderer over  │
└──────────────┘    │  publish           │    │  the Redux draft.      │
                    │  + redux-persist   │    └────────────────────────┘
                    └──────────────────┬─┘
                                       │
                                       ▼
                         ┌──────────────────────┐
                         │  /api/publish (POST) │
                         │  role-gated by proxy │
                         │  + server check      │
                         └──────────┬───────────┘
                                    ▼
                         ┌──────────────────────┐
                         │  publish/index.ts    │
                         │  diff → bump → write │
                         │  releases/<slug>/    │
                         │  + Contentful Release│
                         └──────────────────────┘
```

Everything section-shaped funnels through `lib/sectionRegistry.ts`. Adding a
new section type means:

1. Export a Zod props schema in `lib/schema/section.ts`.
2. Add it to `SectionSchema`'s discriminated union.
3. Register the component in `lib/sectionRegistry.ts`. TypeScript will refuse
   to compile until the registry is exhaustive on `SectionType`.

The renderer never trusts its input: every section is validated by the
registry's schema before its component is mounted, and the whole tree sits
inside an error boundary so a runtime throw inside one section can't crash
the page.

### Route map

| Route                 | Type   | Notes                                         |
|-----------------------|--------|-----------------------------------------------|
| `/`                   | RSC    | Lists published pages from Contentful         |
| `/preview/[slug]`     | RSC    | Renders a Contentful Page through registry    |
| `/preview/fixture`    | RSC    | Test fixture (no Contentful) used by e2e/axe  |
| `/studio/[slug]`      | RSC+CC | Redux-backed editor; role-gated by `proxy.ts` |
| `/login`              | RSC+CC | Mock auth — pick a role                       |
| `/api/auth/login`     | RH     | Sets signed cookie session                    |
| `/api/auth/logout`    | RH     | Clears session                                |
| `/api/publish`        | RH     | Role-gated. Idempotent SemVer publish.        |

`proxy.ts` (Next 16 renamed Middleware to Proxy) gates `/studio/*` to
`editor`+ and `/api/publish` to `publisher`. RBAC is enforced again at the
route handler — UI hiding controls is not security.

---

## 2. Redux slice responsibilities

Three slices live under `store/slices/`. Only `draftPage` is persisted to
localStorage; UI state and publish results are intentionally ephemeral.

- **`draftPage`** — the editable Page (`{ pageId, slug, title, sections[] }`)
  plus `dirty` and `lastSavedAt`. Reducers: `init`, `reset`, `addSection`,
  `removeSection`, `moveSection`, `updateProps`, `updatePageMeta`, `markSaved`.
  Every Studio edit goes through these — no component-local state holds
  draft content.
- **`ui`** — `selectedSectionId`, cookie-mirrored `role` (for hiding
  controls), toast queue. Ephemeral.
- **`publish`** — `status` (`idle` / `publishing` / `succeeded` / `failed`),
  last result (`version`, `changes`, `changelog`, `idempotent`), error
  string. Driven by the `publishDraft` async thunk that POSTs to
  `/api/publish`.

The Studio's `<LivePreview>` reads from `draftPage` and reuses the same
`<SectionRenderer>` that the public `/preview` route uses — schema
validation, error boundaries, and the unsupported-section fallback all
behave identically across both surfaces.

---

## 3. Contentful model + adapter

### Content types (manual setup in Contentful)

| Content type | Field        | Type            | Notes                                |
|--------------|--------------|-----------------|--------------------------------------|
| `Page`       | `slug`       | Short text      | Unique. Doubles as `pageId`.         |
|              | `title`      | Short text      |                                      |
|              | `sections`   | JSON object     | An array of `{ id, type, props }`.   |
| `Release`    | `pageSlug`   | Short text      | Filter key for "latest release".     |
|              | `version`    | Short text      | e.g. `"1.2.0"`.                      |
|              | `snapshot`   | JSON object     | The frozen Page.                     |
|              | `changelog`  | Long text       | Markdown summary of changes.         |
|              | `publishedAt`| Date & time     | ISO 8601.                            |

The brief's `Page.pageId` field has no native equivalent on the Contentful
content type. The adapter aliases `slug → pageId` (`lib/contentful/mappers.ts`).

### Adapter (`lib/contentful/`)

- `contentfulClient.ts` — lazily-built CDA + CPA clients. Exposes
  `getPage(slug, { preview })` and `listPages()`. Both return domain types,
  never raw Contentful entries. UI code never imports `contentful`.
- `managementClient.ts` — CMA-backed `createReleaseEntry()` and
  `getLatestRelease()`. Used only by the publish orchestrator.
- `mappers.ts` — validates each section envelope individually; a malformed
  section is dropped with a warning instead of nuking the whole page.

Switching between draft and published content is isolated to the adapter
(`{ preview }` option); routes pass through Next 16's async `draftMode()`.

---

## 4. Publish + SemVer logic

Source: `lib/publish/{diff,version,changelog,snapshot,index}.ts`.

### Bump rules

| Change                                              | Bump  |
|-----------------------------------------------------|-------|
| Page title edit; prop value edit; reorder           | patch |
| Section added; new (optional or required) prop      | minor |
| Section removed; section `type` changed; required prop removed | major |

Multiple changes take the highest bump. The diff is pure: deterministic,
zero I/O, fully unit-tested in `tests/unit/diff.test.ts` (12 cases).

### Orchestrator (`publish(slug, draft)`)

1. **Validate** the draft with `PageSchema`.
2. **Resolve latest**: try Contentful's latest Release entry; fall back to
   `releases/<slug>/*.json` on disk.
3. **Idempotency check**: if the canonical JSON of the draft equals the
   latest snapshot, return `{ version: latest.version, idempotent: true }`
   without writing anything.
4. **Diff and bump**: `diffPages(prev, next)` → `bumpVersion(prev, bump)`.
5. **Write FS first** (fast, local), then **mirror to Contentful**.
6. Return `{ version, changes, changelog, idempotent: false }`.

Snapshot files are immutable on disk: writes use `flag: "wx"` (fail if
exists). The Contentful `Release` entry is also published immediately so
it's read-visible.

---

## 5. Accessibility evidence

Targeting WCAG 2.2 AAA-oriented.

- **Keyboard operability** — Studio + Preview navigable end-to-end via tab
  / shift-tab. All interactive elements use semantic `<button>` /
  `<a>`. SectionList up/down/delete buttons have explicit `aria-label`s.
- **Visible focus** — `:focus-visible` declared globally in `globals.css`
  with a 3px high-contrast outline and 2px offset; nothing in shadcn
  styles overrides it.
- **Heading hierarchy** — pages emit a single `<h1>`; sections use `<h2>`;
  cards inside the feature grid use `<h3>`.
- **`prefers-reduced-motion`** — global rule disables animations and
  transitions when set.
- **Form labelling** — every input has an associated `<Label htmlFor>`.
  Required fields render a visible asterisk plus `aria-required`.
- **Live regions** — toasts use `aria-live="polite"`; the section list and
  publish-status text are also `aria-live`.
- **Skip link** — first focusable element in `<body>`, jumps to `#main`.
- **Colour contrast** — muted text uses `oklch(0.32 0 0)` on white and
  `oklch(0.78 0 0)` on dark; both clear AAA's 7:1 threshold for normal text.

### Automated evidence

`tests/e2e/a11y.spec.ts` runs `@axe-core/playwright` over `/`, `/login`, and
`/preview/fixture` with the tags `wcag2a/aa, wcag21a/aa, wcag22aa`. It writes
the combined results to `a11y-report.json` (uploaded as a CI artefact) and
**fails the build on any `critical` violation**, per the brief.

Current report (regenerated by CI on every run): zero critical violations
across all three surfaces. One `serious` "scrollable-region-focusable"
violation on `/` is documented in `WRITEUP.md` under known gaps.

---

## 6. What is incomplete and why

- **Drag-and-drop reorder** — replaced with up/down buttons. Brief just says
  "reorder"; buttons are keyboard-accessible by default; DnD would have
  needed `dnd-kit` plus a keyboard-only reorder handler for AAA, ~45m of
  time better spent on the publish flow.
- **Per-section prop coverage in the Studio** — only the props called out
  by the brief (Hero text, CTA label + URL) plus page title are editable
  in-app. FeatureGrid items, Testimonial avatars, etc. can still be
  authored in Contentful and render fine.
- **Image upload in the Studio** — out of scope; image URLs are read from
  Contentful only.
- **Multi-environment support** — `CONTENTFUL_ENVIRONMENT` is read at
  startup; switching live requires a redeploy. Adapter is structured to
  accept an env arg per call but no UI wires it.
- **One `serious` axe violation** (`scrollable-region-focusable` on `/`)
  remains. Triaged but not fixed in this sprint; not critical per the
  brief's CI gate.
- **Studio e2e tests** are conditional on Contentful env (skipped when
  not configured). The schema-renderer is fully covered by the fixture-
  driven `preview.spec.ts` instead. CI passes either way.

---

## Setup

### 1. Contentful

1. Create a space.
2. Add a `Page` content type with fields above (you've already done this).
3. Add a `Release` content type with fields above.
4. Add 1-2 demo Page entries (give one a slug like `landing`).
5. In Settings → API keys, create a CDA + CPA pair, and a Content
   Management Token (CMA).

### 2. Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Generate the cookie secret:

```bash
openssl rand -hex 32
```

### 3. Install + run

```bash
npm ci
npm run dev      # http://localhost:3000
```

### 4. Verify everything

```bash
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest unit suite
npm run test:e2e     # Playwright + axe
```

### 5. CI secrets (GitHub)

For full CI coverage including studio.spec.ts and live Contentful preview,
set these as repo secrets:

- `CONTENTFUL_SPACE_ID`
- `CONTENTFUL_DELIVERY_TOKEN`
- `CONTENTFUL_PREVIEW_TOKEN`
- `CONTENTFUL_MANAGEMENT_TOKEN`
- `CONTENTFUL_ENVIRONMENT` (optional, defaults to `master`)
- `AUTH_COOKIE_SECRET`

Without them, the workflow uses safe placeholders — schema renderer, RBAC,
axe, and unit tests still run; studio.spec.ts is skipped by design.

### 6. Deploy to Vercel

1. Import the repo into Vercel (Framework preset is detected: Next.js).
2. Add the same six env vars from above to Vercel's project settings.
3. Deploy.

The `releases/` directory is gitignored and exists only on the local
machine — Contentful's `Release` entries are the durable source of truth
for the deployed app.

### 7. Demo accounts

The mock auth ships three users (no passwords — pick a role):

- `viewer` — preview only
- `editor` — preview + edit
- `publisher` — preview + edit + publish

---

## Project structure (annotated)

```
app/
  layout.tsx, providers.tsx, globals.css       Root + Redux provider + AAA tokens
  page.tsx                                     Home: lists published pages
  login/                                       Mock auth UI
  preview/[slug]/                              Live Contentful preview
  preview/fixture/                             Test fixture (CI/axe friendly)
  studio/[slug]/                               Redux-backed editor
  api/auth/*                                   Login/logout (signed cookie)
  api/publish/                                 SemVer publish endpoint

components/
  SectionRenderer.tsx, SectionErrorBoundary    Validate + graceful fallback
  sections/*.tsx                               Hero, FeatureGrid, Testimonial, CTA
  ui/                                          shadcn-style primitives
  a11y/SkipLink.tsx                            "Skip to main content"

lib/
  schema/                                      Zod types + Page/Section unions
  sectionRegistry.ts                           Single source of section wiring
  contentful/                                  CDA + CPA + CMA adapters
  auth/                                        Signed cookie + role policy
  publish/                                     diff, version, snapshot, orchestrator
  utils/                                       env reader, cn helper

store/
  index.ts                                     configureStore + redux-persist
  slices/                                      draftPage, ui, publish

tests/
  unit/                                        schema, diff, version, idempotency
  e2e/                                         preview, studio, rbac, a11y(+axe)

proxy.ts                                       Next 16 middleware → RBAC gate
.github/workflows/ci.yml                       Lint, typecheck, test, build, e2e
releases/                                      Local snapshot store (gitignored)
```
