/**
 * Token Refresh Route Handler
 *
 * 📍 src/app/api/auth/refresh/route.ts
 *
 * Called by middleware when a role-protected route is accessed but the
 * accessToken cookie is absent (expired) while a refreshToken is still present.
 *
 * Flow:
 *   1. Read refreshToken from cookies.
 *   2. Exchange it for a new accessToken via the backend (lib/auth/refresh-session.ts
 *      — branches on token kind (D3) and retries once on a transient error (D5)).
 *   3. Set the new accessToken as a server-side cookie.
 *   4. Redirect the user back to the originally requested route (ruri param).
 *
 * If refresh fails outright, redirect to /login. If it's merely a transient
 * provider error, keep the session and render a small retry page instead
 * (see the "temporary" branch below) — this is a full-page navigation
 * triggered by the proxy, so a plain fetch retry isn't an option here.
 *
 * The `ruri` round trip preserves the original query string (see
 * lib/auth/return-path.ts). An OAuth callback like
 * /dashboard/connect-discord?code=… is worthless once `code` is dropped.
 */

import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { performRefresh } from "@/lib/auth/refresh-session";
import { sanitizeReturnPath } from "@/lib/auth/return-path";

/**
 * Redirect to a path on whatever origin the browser is already on.
 *
 * Deliberately NOT `NextResponse.redirect(new URL(path, request.url))`. On
 * Netlify's Next runtime `request.url` inside a route handler is rebuilt from
 * the deploy's own URL — the immutable `<deploy-id>--<site>.netlify.app`
 * permalink — not the custom domain that was requested. Resolving against it
 * emitted an absolute, cross-origin Location that moved users off
 * app.mulearn.org mid-session: their auth cookies stayed on the original
 * origin, the Discord callback (whose redirect_uri is fixed to app.mulearn.org)
 * came back to a different origin than the one holding them, and every
 * subsequent history entry — so every Back press — was stuck on a frozen build.
 *
 * A relative Location is valid per RFC 7231 §7.1.2 and the browser resolves it
 * against the current origin, which sidesteps having to trust a forwarded-host
 * header to reconstruct the public URL.
 *
 * `path` must be same-origin: a leading "/" and never "//" (protocol-relative).
 * Every caller below builds it from sanitizeReturnPath, which guarantees an
 * allowlisted, slash-stripped path.
 */
function redirectToPath(path: string): NextResponse {
  return new NextResponse(null, {
    status: 307,
    headers: { Location: path },
  });
}

/** `/login?ruri=…`, with the return path encoded as a single query value. */
function loginPathWithReturn(returnPath: string): string {
  return `/login?${new URLSearchParams({ ruri: returnPath })}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawPath = searchParams.get("ruri") ?? "dashboard";
  const returnPath = sanitizeReturnPath(rawPath);

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  // Clear every auth cookie before redirecting to /login. The proxy treats a
  // lingering (even expired) accessToken as "logged in" and bounces /login back
  // to /dashboard, so leaving it behind would create a redirect loop.
  const clearAuthCookies = () => {
    cookieStore.delete("accessToken");
    cookieStore.delete("refreshToken");
    cookieStore.delete("isAuthenticated");
  };

  if (!refreshToken) {
    clearAuthCookies();
    return redirectToPath(loginPathWithReturn(returnPath));
  }

  const outcome = await performRefresh(refreshToken);

  if (outcome.kind === "temporary") {
    // 429/5xx/timeout/Redis-down, even after one retry — transient, not a
    // dead session (D5). Do NOT clear cookies and do NOT bounce to /login.
    // A redirect back to returnPath would loop forever (the proxy would see
    // the same missing/expired accessToken and send them right back here),
    // so render a small "retrying" page instead — a 200, not a redirect —
    // that waits a few seconds and then retries the original URL.
    const target = `/${returnPath}`;
    return new NextResponse(
      `<!doctype html><html><head><meta http-equiv="refresh" content="5;url=${target}"></head>` +
        `<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;color:#555">` +
        `<p>Connection problem, retrying…</p></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html" } },
    );
  }

  if (outcome.kind === "failed") {
    clearAuthCookies();
    return redirectToPath(loginPathWithReturn(returnPath));
  }

  const isProduction = process.env.NODE_ENV === "production";

  if (outcome.refreshToken) {
    // ROTATION: the provider consumed the presented refresh token and
    // returned a replacement. The new one MUST be stored — presenting a
    // spent token is treated as theft and revokes the whole family, signing
    // the person out everywhere. See lib/auth/oidc-refresh.ts.
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
    // Must match authStore.setTokens' 15-minute accessToken lifetime —
    // otherwise the cookie outlives the JWT it holds and browsers keep
    // presenting an already-expired token until this cookie itself expires.
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

  return redirectToPath(`/${returnPath}`);
}
