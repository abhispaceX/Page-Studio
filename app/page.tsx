import Link from "next/link";
import {
  ArrowRight,
  Eye,
  FileText,
  Pencil,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";

import { listPages } from "@/lib/contentful/contentfulClient";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let pages: Array<{ slug: string; title: string }> = [];
  let error: string | null = null;
  try {
    pages = await listPages();
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "Failed to load pages from Contentful.";
  }

  const session = await getSession();

  return (
    <main
      id="main"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:py-14"
    >
      <section className="brand-gradient relative overflow-hidden rounded-3xl p-8 text-white shadow-xl shadow-violet-500/20 sm:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(600px 300px at 80% 20%, rgba(255,255,255,.35), transparent), radial-gradient(500px 400px at 10% 90%, rgba(255,255,255,.2), transparent)",
          }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
            <Sparkles className="h-3 w-3" aria-hidden />
            Page Studio
          </span>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Schema-driven landing pages, edited in a Redux-backed Studio,
            frozen into immutable versioned releases.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/90">
            Pick a page below to preview a published release or open it in
            the Studio for editing.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/preview/fixture"
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-violet-800 shadow-sm transition-colors hover:bg-violet-50"
            >
              <Eye className="h-4 w-4" aria-hidden />
              See a demo
            </Link>
            {!session ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                Sign in to edit
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Your pages</h2>
            <p className="text-sm text-muted-foreground">
              Live entries from your Contentful space.
            </p>
          </div>
          <Link
            href="https://app.contentful.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1 text-sm font-medium text-violet-700 hover:underline sm:inline-flex"
          >
            Open Contentful
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/5 p-5"
          >
            <p className="text-sm font-semibold text-destructive">
              Contentful is not reachable.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check that <code className="font-mono">.env.local</code> contains
              valid Contentful tokens, then refresh.
            </p>
            <pre className="mt-3 max-h-32 overflow-auto rounded bg-muted p-3 text-xs">
              {error}
            </pre>
          </div>
        ) : null}

        {!error && pages.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/70 p-10 text-center shadow-sm">
            <FileText
              className="mx-auto h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
            <h3 className="mt-3 text-base font-semibold">No pages yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a Page entry in Contentful and assign it a slug.
            </p>
          </div>
        ) : null}

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((p, i) => (
            <li key={p.slug}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md">
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 opacity-0 transition-opacity group-hover:opacity-100"
                />
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 place-items-center rounded-lg bg-violet-100 text-violet-700"
                  >
                    {i % 2 === 0 ? (
                      <Zap className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </span>
                  <span className="rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Page
                  </span>
                </div>
                <div className="mt-4 min-w-0">
                  <h3 className="truncate text-lg font-semibold tracking-tight">
                    {p.title}
                  </h3>
                  <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                    /{p.slug}
                  </p>
                </div>
                <div className="mt-6 flex gap-2">
                  <Link
                    href={`/preview/${p.slug}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    Preview
                  </Link>
                  <Link
                    href={`/studio/${p.slug}`}
                    className="brand-gradient inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm transition-transform hover:scale-[1.02]"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Studio
                  </Link>
                </div>
              </article>
            </li>
          ))}

          <li>
            <Link
              href="https://app.contentful.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full min-h-[12rem] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-6 text-center text-sm text-muted-foreground transition-colors hover:border-violet-400 hover:bg-violet-50 hover:text-foreground"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-violet-100 text-violet-700 group-hover:bg-violet-200">
                <Plus className="h-5 w-5" aria-hidden />
              </span>
              <span className="mt-3 font-semibold text-foreground">
                New page
              </span>
              <span className="mt-0.5 text-xs">in Contentful</span>
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
