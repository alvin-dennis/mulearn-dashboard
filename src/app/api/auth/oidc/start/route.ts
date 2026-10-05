/**
 * Start "Sign in with μLearn"
 *
 * 📍 src/app/api/auth/oidc/start/route.ts
 *
 * Begins the authorization-code + PKCE flow. Runs on the server so that the
 * PKCE verifier is created here and stored in an httpOnly cookie — page
 * JavaScript never sees it, so an XSS bug cannot complete a code exchange.
 * That is the point of doing this in a route handler rather than in the
 * browser (audit finding F12: tokens were readable by any script on the page).
 *
 * Flow:
 *   1. Generate a PKCE verifier + challenge and a `state`.
 *   2. Stash the verifier and state in short-lived httpOnly cookies.
 *   3. Redirect to the identity provider with only the CHALLENGE.
 *
 * The verifier never leaves this server, so a stolen authorization code cannot
 * be exchanged by anyone else.
 */

import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import {
  createCodeChallenge,
  createCodeVerifier,
  createState,
} from "@/lib/auth/pkce";
import { sanitizeReturnPath } from "@/lib/auth/return-path";

/** Cookie names are shared with the callback; changing one breaks the pair. */
export const PKCE_VERIFIER_COOKIE = "oidc_verifier";
export const PKCE_STATE_COOKIE = "oidc_state";
export const PKCE_RETURN_COOKIE = "oidc_return";

/**
 * Ten minutes. Long enough to sign in — including creating an account and
 * mistyping a password — and short enough that an abandoned attempt does not
 * leave a usable verifier lying in the browser overnight.
 */
const FLOW_TTL_SECONDS = 600;

export async function GET(request: NextRequest) {
  const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER;
  const clientId = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID;
  // Fixed from env, never derived from request.nextUrl.origin. On Netlify
  // that origin is the deploy permalink (<deploy-id>--<site>.netlify.app),
  // not app.mulearn.org — and authserver matches redirect_uri exactly, so
  // prod sign-in would be refused (D4).
  const redirectUri = process.env.OIDC_REDIRECT_URI;

  if (!issuer || !clientId || !redirectUri) {
    // Configuration error, not a user error. Fail visibly rather than
    // redirecting somewhere confusing.
    return NextResponse.json(
      { error: "Sign-in is not configured" },
      { status: 500 },
    );
  }

  const verifier = createCodeVerifier();
  const challenge = await createCodeChallenge(verifier);
  const state = createState();

  const returnPath = sanitizeReturnPath(
    request.nextUrl.searchParams.get("ruri") ?? "dashboard",
  );

  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  const flowCookie = {
    httpOnly: true,
    secure: isProduction,
    // `lax`, deliberately, and NOT `strict`. The provider's redirect back here
    // is a cross-site top-level navigation, and `strict` withholds cookies on
    // exactly that — the callback would arrive with no verifier and every
    // sign-in would fail. See lib/auth/token-store.ts for the same trap hit
    // once already with the Discord return.
    sameSite: "lax" as const,
    path: "/",
    maxAge: FLOW_TTL_SECONDS,
  };

  cookieStore.set(PKCE_VERIFIER_COOKIE, verifier, flowCookie);
  cookieStore.set(PKCE_STATE_COOKIE, state, flowCookie);
  cookieStore.set(PKCE_RETURN_COOKIE, returnPath, flowCookie);

  const authorizeUrl = new URL("/oauth/authorize/", issuer);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set(
    "scope",
    "openid profile email mulearn.read mulearn.write",
  );
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  // S256 only. `plain` sends the verifier itself and protects nothing.
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  // Absolute, and cross-origin by design: this one genuinely goes to the
  // identity provider. The relative-Location rule in ../refresh/route.ts
  // applies to same-origin redirects, which this is not.
  const authorizeHref = authorizeUrl.toString();

  // D9: `/register` hands off here with `?signup=1`. Route through
  // authentication-module's own /signup screen first (proxied to
  // authserver's /accounts/api/signup/ for the write) instead of straight to
  // /oauth/authorize/ — `next` carries the browser on to the normal
  // authorize step once the account exists.
  if (request.nextUrl.searchParams.get("signup") === "1") {
    const signupUrl = new URL("/accounts/signup/", issuer);
    signupUrl.searchParams.set("next", authorizeHref);
    return NextResponse.redirect(signupUrl.toString(), 307);
  }

  return NextResponse.redirect(authorizeHref, 307);
}
