import { NextResponse } from "next/server";

import { findSeededUser } from "@/lib/auth/users";
import { sessionCookie, signSession } from "@/lib/auth/cookie";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username =
    typeof body === "object" && body !== null
      ? (body as { username?: unknown }).username
      : undefined;

  if (typeof username !== "string") {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const user = findSeededUser(username);
  if (!user) {
    return NextResponse.json({ error: "Unknown user" }, { status: 401 });
  }

  const token = signSession({
    username: user.username,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
  });

  const res = NextResponse.json({ ok: true, role: user.role });
  const c = sessionCookie.serialize(token);
  res.cookies.set(c);
  return res;
}
