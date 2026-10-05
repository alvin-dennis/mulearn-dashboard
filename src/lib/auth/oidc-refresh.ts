/**
 * Refreshing an OIDC session.
 *
 * 📍 src/lib/auth/oidc-refresh.ts
 *
 * Server-side only. The refresh token is held in an httpOnly cookie, so this
 * cannot run in the browser — which is the point (audit finding F12).
 *
 * ROTATION IS NOT OPTIONAL HERE
 * ----------------------------
 * The provider is configured with ROTATE_REFRESH_TOKEN, so presenting a
 * refresh token CONSUMES it and returns a replacement. Two consequences the
 * caller must respect:
 *
 *   1. The new refresh token has to be stored. Keeping the old one means the
 *      next refresh presents a token that has already been spent.
 *   2. Presenting a spent token is treated as theft — the provider revokes the
 *      entire token family and signs the person out everywhere. That is the
 *      desired behaviour for a stolen token and a self-inflicted logout if we
 *      drop the replacement on the floor.
 *
 * So a genuinely failed refresh must clear the cookies and send the person to
 * sign in again, never retry with the same token.
 *
 * TEMPORARY vs FAILED
 * -------------------
 * Not every non-2xx means "this session is invalid". /oauth/token/'s
 * 429-at-120/min-per-IP throttle is authserver's correct, intended behaviour
 * — and every dashboard refresh shares one server IP, so it triggers at real
 * scale. A 5xx or network timeout means authserver is unreachable right now.
 * Neither means the refresh token itself is bad. Logging someone out for a
 * transient provider hiccup is strictly worse than leaving them signed in and
 * retrying. Only 400 (invalid_grant — the token was rejected or already
 * spent) and 401 mean the session is actually dead.
 */

export interface RefreshedSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Session is actually invalid — clear cookies, send to sign in again. */
export class RefreshFailed extends Error {}

/** Provider hiccup (429/5xx/timeout/bad body) — keep the session, maybe retry. */
export class RefreshTemporary extends Error {
  retryAfterSeconds?: number;
  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Exchange a refresh token for a new pair.
 *
 * @throws RefreshFailed when the provider rejects the token (400/401) — the
 *   caller must clear the session rather than retry.
 * @throws RefreshTemporary on 429/5xx/timeout/malformed response — the caller
 *   should keep the session and may retry, honoring `retryAfterSeconds`.
 */
export async function refreshOidcSession(
  refreshToken: string,
  { issuer, clientId }: { issuer: string; clientId: string },
): Promise<RefreshedSession> {
  let response: Response;
  try {
    response = await fetch(new URL("/oauth/token/", issuer), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
      }),
      // A hanging provider must not hold a request open. Refresh sits in front
      // of ordinary navigation, so a slow failure here is felt on every page.
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new RefreshTemporary("provider unreachable");
  }

  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) {
      const retryAfter = response.headers.get("Retry-After");
      throw new RefreshTemporary(
        `provider returned ${response.status}`,
        retryAfter ? Number(retryAfter) : undefined,
      );
    }
    // 400 invalid_grant (including an already-spent token — the provider has
    // now revoked the family) or 401. Nothing to retry.
    throw new RefreshFailed(`provider returned ${response.status}`);
  }

  let body: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  try {
    body = await response.json();
  } catch {
    throw new RefreshTemporary("provider returned a non-JSON response");
  }

  if (!body.access_token || !body.refresh_token) {
    // A response without a replacement refresh token would leave us holding a
    // spent one. Treat it as a failure rather than storing half a session.
    throw new RefreshFailed("provider returned an incomplete token set");
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in ?? 15 * 60,
  };
}
