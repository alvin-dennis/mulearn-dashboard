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
 *   2. Exchange it for a new accessToken via the backend.
 *   3. Set the new accessToken as a server-side cookie.
 *   4. Redirect the user back to the originally requested route (ruri param).
 *
 * If refresh fails, redirect to /login.
 *
 * The `ruri` round trip preserves the original query string (see
 * lib/auth/return-path.ts). An OAuth callback like
 * /dashboard/connect-discord?code=… is worthless once `code` is dropped.
 */

import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { refreshAccessTokenServer } from "@/api/refresh.server";
import { sanitizeReturnPath } from "@/lib/auth/return-path";

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
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("ruri", returnPath);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const newAccessToken = await refreshAccessTokenServer(refreshToken);

    if (!newAccessToken) {
      throw new Error("No access token in refresh response");
    }

    const isProduction = process.env.NODE_ENV === "production";

    cookieStore.set("accessToken", newAccessToken, {
      httpOnly: false,
      expires: new Date(Date.now() + 86_400_000),
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

    return NextResponse.redirect(new URL(`/${returnPath}`, request.url));
  } catch {
    clearAuthCookies();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("ruri", returnPath);
    return NextResponse.redirect(loginUrl);
  }
}
