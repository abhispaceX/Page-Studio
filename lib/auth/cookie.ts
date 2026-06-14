import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/utils/env";
import { isRole, type Role } from "./roles";

/**
 * Minimal signed-cookie session. Format: base64url(JSON(payload)).hex(hmac).
 * Not a JWT — we don't need claim flexibility, just integrity. HMAC-SHA256.
 */

export interface SessionPayload {
  username: string;
  role: Role;
  iat: number;
}

const COOKIE_NAME = "cms_session";

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("hex");
}

export function signSession(payload: SessionPayload): string {
  const secret = env.auth.cookieSecret;
  const payloadB64 = b64urlEncode(Buffer.from(JSON.stringify(payload)));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

export function verifySession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  let secret: string;
  try {
    secret = env.auth.cookieSecret;
  } catch {
    return null;
  }
  const expected = sign(payloadB64, secret);
  // Constant-time compare to avoid timing attacks on the signature.
  if (expected.length !== sig.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const parsed = JSON.parse(b64urlDecode(payloadB64).toString("utf8")) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as SessionPayload).username !== "string" ||
      !isRole((parsed as SessionPayload).role)
    ) {
      return null;
    }
    return parsed as SessionPayload;
  } catch {
    return null;
  }
}

export const sessionCookie = {
  name: COOKIE_NAME,
  serialize(token: string): {
    name: string;
    value: string;
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: "/";
    maxAge: number;
  } {
    return {
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    };
  },
};
