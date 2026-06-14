import Link from "next/link";
import {
  CheckCircle2,
  GitBranch,
  Layers,
  Lock,
  Sparkles,
  Zap,
} from "lucide-react";

import { getSession } from "@/lib/auth/session";
import { SEEDED_USERS } from "@/lib/auth/users";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

type SP = Promise<{ next?: string }>;

const FEATURES = [
  {
    icon: Layers,
    title: "Schema-driven sections",
    body: "Every block is validated by Zod before render. Unknown types fall back gracefully — never crash.",
  },
  {
    icon: GitBranch,
    title: "Immutable versioned releases",
    body: "Each publish freezes a snapshot, bumps SemVer, and writes a Release entry to Contentful.",
  },
  {
    icon: Zap,
    title: "Redux-backed Studio",
    body: "Add, reorder, edit. Drafts persist to localStorage so reloads never lose your work.",
  },
  {
    icon: Lock,
    title: "Server-enforced RBAC",
    body: "Viewer previews. Editor edits. Publisher ships. Enforced at the network boundary.",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const { next } = await searchParams;
  const session = await getSession();

  return (
    <main
      id="main"
      className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-16"
    >
      {/* Left: pitch */}
      <section
        aria-labelledby="pitch-h"
        className="brand-gradient relative hidden overflow-hidden rounded-3xl p-10 text-white shadow-xl shadow-violet-500/20 lg:block"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(600px 300px at 80% 20%, rgba(255,255,255,.35), transparent), radial-gradient(500px 400px at 10% 90%, rgba(255,255,255,.2), transparent)",
          }}
        />
        <div className="relative flex h-full flex-col">
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
            <Sparkles className="h-3 w-3" aria-hidden />
            Page Studio
          </span>

          <h2
            id="pitch-h"
            className="mt-5 text-3xl font-semibold leading-tight tracking-tight xl:text-4xl"
          >
            Build landing pages that ship as versioned releases.
          </h2>
          <p className="mt-3 max-w-md text-base text-white/85">
            A schema-driven page builder backed by Contentful, edited in a
            Redux-powered Studio, frozen into immutable SemVer-bumped
            snapshots on publish.
          </p>

          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-white/15 backdrop-blur"
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-0.5 text-sm text-white/80">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-auto pt-8 text-xs text-white/70">
            Next.js · TypeScript · Redux Toolkit · Contentful · WCAG 2.2 AAA
          </p>
        </div>
      </section>

      {/* Right: sign-in card */}
      <section
        aria-labelledby="signin-h"
        className="flex flex-col justify-center"
      >
        <div className="rounded-3xl border bg-card p-7 shadow-xl sm:p-9">
          {/* Mobile-only short pitch (the left column is hidden < lg) */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span
              aria-hidden
              className="brand-gradient grid h-11 w-11 place-items-center rounded-xl text-white shadow-md"
            >
              <Layers className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <div>
              <h1 className="text-xl font-semibold">Page Studio</h1>
              <p className="text-xs text-muted-foreground">
                Sign in to continue
              </p>
            </div>
          </div>

          <h1 id="signin-h" className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a role to continue.
          </p>

          <div className="mt-5 flex items-start gap-2 rounded-lg border border-violet-100 bg-violet-50/60 p-3 text-xs text-violet-900">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
            <p>
              Mock identity provider. Real RBAC is enforced server-side on
              every request — viewer previews, editor edits drafts, publisher
              ships releases.
            </p>
          </div>

          {session ? (
            <div
              role="status"
              className="mt-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Signed in as{" "}
              <strong className="font-semibold">{session.username}</strong>{" "}
              ({session.role}).
              <Link
                href={next ?? "/"}
                className="ml-auto font-semibold text-emerald-800 underline-offset-2 hover:underline"
              >
                Continue →
              </Link>
            </div>
          ) : null}

          <div className="mt-6">
            <LoginForm users={SEEDED_USERS} next={next ?? "/"} />
          </div>
        </div>
      </section>
    </main>
  );
}
