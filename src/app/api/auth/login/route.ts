import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, validateLogin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    accessCode?: string;
  };
  const result = validateLogin({
    name: body.name || "",
    email: body.email || "",
    accessCode: body.accessCode || "",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const token = await createSessionToken(result.user);
  const response = NextResponse.json({ user: result.user });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}
