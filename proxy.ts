import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { sessionCookie, verifySession } from "@/lib/auth/cookie";
import { can } from "@/lib/auth/roles";

/**
 * Next 16 renames Middleware to Proxy. File at project root, function named
 * `proxy`. Runs on every matched request before the route handler.
 *
 * Auth-first: every page except the login surface itself requires a signed
 * session cookie. On top of that:
 *   - /studio/*   requires `edit`  (editor or publisher)
 *   - /api/publish requires `publish` (publisher)
 */

// Paths that anonymous users may hit. Everything else redirects to /login.
const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  // The demo fixture is intentionally public so the "See a demo" CTA on the
  // login page works for first-time visitors.
  "/preview/fixture",
]);

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(sessionCookie.name)?.value;
  const session = verifySession(token);

  // Any unauthenticated request → bounce to login with `next` set so the
  // user lands where they tried to go originally after signing in.
  if (!session) {
    // API routes get a JSON 401 rather than an HTML redirect.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/studio/")) {
    if (!can(session.role, "edit")) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/api/publish") {
    if (!can(session.role, "publish")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match everything except Next internals and static assets (anything with
  // a `.` in the last path segment).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
