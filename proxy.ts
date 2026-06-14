import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifySession } from "@/lib/auth/cookie";
import { sessionCookie } from "@/lib/auth/cookie";
import { can } from "@/lib/auth/roles";

/**
 * Next 16 renames Middleware to Proxy. File at project root, function named
 * `proxy`. Runs on every matched request before the route handler.
 *
 * Enforces RBAC at the network boundary:
 *  - /studio/*   → requires `edit`  (editor or publisher)
 *  - /api/publish → requires `publish` (publisher)
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get(sessionCookie.name)?.value;
  const session = verifySession(token);

  if (pathname.startsWith("/studio/")) {
    if (!can(session?.role, "edit")) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/api/publish") {
    if (!can(session?.role, "publish")) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio/:path*", "/api/publish"],
};
