import Link from "next/link";
import { Layers, LogIn } from "lucide-react";

import { getSession } from "@/lib/auth/session";
import { SignOutButton } from "./SignOutButton";

const ROLE_STYLES: Record<string, string> = {
  viewer: "bg-slate-100 text-slate-800 border-slate-200",
  editor: "bg-sky-50 text-sky-800 border-sky-200",
  publisher: "bg-violet-100 text-violet-900 border-violet-200",
};

export async function AppNav() {
  const session = await getSession();
  return (
    <header className="sticky top-0 z-30 border-b border-white/40 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold tracking-tight"
        >
          <span
            aria-hidden="true"
            className="brand-gradient grid h-9 w-9 place-items-center rounded-xl text-white shadow-md shadow-violet-500/30"
          >
            <Layers className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="text-base">
            Page <span className="brand-text-gradient">Studio</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className="hidden rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-violet-50 hover:text-violet-700 sm:inline-block"
          >
            Pages
          </Link>
          {session ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <span
                className={
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold " +
                  (ROLE_STYLES[session.role] ??
                    "bg-muted text-muted-foreground")
                }
                aria-label={`Signed in as ${session.username}, role ${session.role}`}
              >
                <span
                  aria-hidden="true"
                  className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current"
                />
                {session.role}
              </span>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.username}
              </span>
              <SignOutButton />
            </div>
          ) : (
            <Link
              href="/login"
              className="brand-gradient inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm shadow-violet-500/30 transition-transform hover:scale-[1.02]"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden />
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
