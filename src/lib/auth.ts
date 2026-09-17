import { timingSafeEqual as cryptoTimingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { SessionUser } from "./types";

export const SESSION_COOKIE = "pamsa_session";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is required in production.");
    }
    return new TextEncoder().encode("pamsa-dev-only-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

export function timingSafeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return cryptoTimingSafeEqual(left, right);
}

export function parseAllowlist(raw: string): { name: string; email: string }[] {
  return raw
    .split(/[;,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const named = entry.match(/^(.+?)\s*<([^>]+)>$/);
      if (named) {
        return [{ name: named[1].trim(), email: named[2].trim().toLowerCase() }];
      }
      if (entry.includes("@")) {
        return [{ name: "", email: entry.toLowerCase() }];
      }
      return [];
    });
}

function namesMatch(expected: string, given: string) {
  return expected.trim().toLowerCase().replace(/\s+/g, " ") === given.trim().toLowerCase().replace(/\s+/g, " ");
}

export function validateLogin(input: {
  name: string;
  email: string;
  accessCode: string;
}): { ok: true; user: SessionUser } | { ok: false; error: string } {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const accessCode = input.accessCode;
  const expected = process.env.ACCESS_CODE;

  if (!name || !email || !email.includes("@")) {
    return { ok: false, error: "Enter your name and a valid work email." };
  }
  if (!expected) {
    return { ok: false, error: "Server is missing ACCESS_CODE." };
  }
  if (!timingSafeEqual(accessCode, expected)) {
    return { ok: false, error: "That access code is not valid." };
  }

  const allowlist = parseAllowlist(process.env.TEAM_ALLOWLIST || process.env.TEAM_EMAIL_ALLOWLIST || "");
  if (allowlist.length === 0) {
    return {
      ok: false,
      error: "Access is closed until the team allowlist is configured.",
    };
  }

  const match = allowlist.find((entry) => entry.email === email);
  if (!match) {
    return { ok: false, error: "This name and work email are not on the team allowlist." };
  }
  if (match.name && !namesMatch(match.name, name)) {
    return {
      ok: false,
      error: "This email is allowlisted, but the name does not match. Use the exact name on the list.",
    };
  }

  return { ok: true, user: { name: match.name || name, email } };
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ name: user.name, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secretKey());
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const name = typeof payload.name === "string" ? payload.name : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!name || !email) return null;
    return { name, email };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}
