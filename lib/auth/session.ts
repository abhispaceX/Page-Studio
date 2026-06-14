import "server-only";
import { cookies } from "next/headers";

import { sessionCookie, verifySession, type SessionPayload } from "./cookie";

/**
 * Server-only session reader. Returns null when the cookie is missing,
 * malformed, or signed with the wrong secret.
 */
export async function getSession(): Promise<SessionPayload | null> {
  // Next 16: cookies() is async.
  const store = await cookies();
  const raw = store.get(sessionCookie.name)?.value;
  return verifySession(raw);
}
