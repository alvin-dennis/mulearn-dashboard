/**
 * Shared server-side refresh logic.
 *
 * 📍 src/lib/auth/refresh-session.ts
 *
 * One place that does "exchange a refresh token for a new access token",
 * branching on token kind (D3) and retrying once on a transient provider
 * error (D5) — used by:
 *   - src/app/api/auth/refresh/route.ts (full-page navigation, called by the proxy)
 *   - src/app/api/auth/refresh/session/route.ts (same-origin fetch, D6)
 *   - src/api/server.ts (Server Component / Route Handler calls)
 *
 * Previously each of these re-implemented the OIDC-vs-legacy branch and the
 * failure handling slightly differently, which is how D3/D5 drifted apart in
 * the first place.
 */

import {
  LegacyRefreshTemporary,
  refreshAccessTokenServer,
} from "@/api/refresh.server";
import { RefreshTemporary, refreshOidcSession } from "./oidc-refresh";
import { isLegacyRefreshToken } from "./token-kind";

export type RefreshOutcome =
  | {
      kind: "ok";
      accessToken: string;
      /** Present only for OIDC — the rotated replacement that must be stored. */
      refreshToken?: string;
      maxAgeMs: number;
    }
  | { kind: "failed" }
  | { kind: "temporary" };

async function attempt(refreshToken: string): Promise<RefreshOutcome> {
  const issuer = process.env.NEXT_PUBLIC_OIDC_ISSUER;
  const clientId = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID;
  const useOidc = issuer && clientId && !isLegacyRefreshToken(refreshToken);

  if (useOidc) {
    const session = await refreshOidcSession(refreshToken, {
      issuer,
      clientId,
    });
    return {
      kind: "ok",
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      maxAgeMs: session.expiresIn * 1000,
    };
  }

  const accessToken = await refreshAccessTokenServer(refreshToken);
  if (!accessToken) return { kind: "failed" };
  return { kind: "ok", accessToken, maxAgeMs: 15 * 60 * 1000 };
}

/**
 * Exchange a refresh token for a new access token, retrying once on a
 * transient provider error (429/5xx/timeout/Redis-down) before giving up.
 * Never throws — "failed" and "temporary" are both ordinary outcomes the
 * caller must handle (clear session vs. keep it, respectively).
 */
export async function performRefresh(
  refreshToken: string,
): Promise<RefreshOutcome> {
  try {
    return await attempt(refreshToken);
  } catch (err) {
    if (
      !(
        err instanceof RefreshTemporary || err instanceof LegacyRefreshTemporary
      )
    ) {
      return { kind: "failed" };
    }
    const waitMs =
      err instanceof RefreshTemporary && err.retryAfterSeconds
        ? Math.min(err.retryAfterSeconds * 1000, 5_000)
        : 1_000;
    await new Promise((r) => setTimeout(r, waitMs));
    try {
      return await attempt(refreshToken);
    } catch (err2) {
      if (
        err2 instanceof RefreshTemporary ||
        err2 instanceof LegacyRefreshTemporary
      ) {
        return { kind: "temporary" };
      }
      return { kind: "failed" };
    }
  }
}
