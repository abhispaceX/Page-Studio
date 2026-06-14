import Link from "next/link";
import { ShieldCheck, Sparkles } from "lucide-react";

import { getSession } from "@/lib/auth/session";
import { SEEDED_USERS } from "@/lib/auth/users";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

type SP = Promise<{ next?: string }>;

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
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 sm:px-6"
    >
      <div className="rounded-3xl border bg-card p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-white shadow-sm"
          >
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">
              Pick a role to continue.
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-lg border border-violet-100 bg-violet-50/60 p-3 text-xs text-violet-900">
          <Sparkles
            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
            aria-hidden
          />
          <p>
            This is a mock identity provider. RBAC is enforced server-side on
            every request — viewer can preview, editor can edit drafts,
            publisher can ship releases.
          </p>
        </div>

        {session ? (
          <p
            role="status"
            className="mb-4 rounded-md border bg-muted/40 px-3 py-2 text-sm"
          >
            Already signed in as{" "}
            <strong className="font-semibold">{session.username}</strong>{" "}
            ({session.role}).{" "}
            <Link href={next ?? "/"} className="text-violet-700 hover:underline">
              Continue →
            </Link>
          </p>
        ) : null}

        <LoginForm users={SEEDED_USERS} next={next ?? "/"} />
      </div>
    </main>
  );
}
