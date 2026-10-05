/**
 * Browser-side session refresh (D6).
 *
 * 📍 src/app/api/auth/refresh/session/route.ts
 *
 * refresh.client.ts previously read the refresh token via js-cookie, but the
 * OIDC refresh token is httpOnly — that read `undefined` and silently fell
 * through to the legacy endpoint. Net effect: after 15 min idle, the first
 * API call 302'd to /login → proxy → /dashboard → a full reload, losing
 * whatever was on the page.
 *
 * This route is same-origin and reads the httpOnly refresh cookie
 * server-side instead, so the browser never needs to touch the token at
 * all — it calls this with `credentials: "include"` and gets back just the
 * new access token.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { performRefresh } from "@/lib/auth/refresh-session";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (!refreshToken) {
    return NextResponse.json({ accessToken: null }, { status: 401 });
  }

  const outcome = await performRefresh(refreshToken);

  if (outcome.kind === "temporary") {
    // Transient provider error (D5) — the session is still good, just
    // unrefreshable right now. 503, not 401: the caller must not treat this
    // as "log me out".
    return NextResponse.json(
      { accessToken: null, temporary: true },
      {
        status: 503,
      },
    );
  }

  if (outcome.kind === "failed") {
    cookieStore.delete("accessToken");
    cookieStore.delete("refreshToken");
    cookieStore.delete("isAuthenticated");
    return NextResponse.json({ accessToken: null }, { status: 401 });
  }

  const isProduction = process.env.NODE_ENV === "production";

  if (outcome.refreshToken) {
    cookieStore.set("refreshToken", outcome.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  cookieStore.set("accessToken", outcome.accessToken, {
    httpOnly: false,
    expires: new Date(Date.now() + outcome.maxAgeMs),
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });

  cookieStore.set("isAuthenticated", "true", {
    expires: new Date(Date.now() + 86_400_000),
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });

  return NextResponse.json({ accessToken: outcome.accessToken });
}
