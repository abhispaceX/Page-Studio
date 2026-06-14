import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth/cookie";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: sessionCookie.name,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
