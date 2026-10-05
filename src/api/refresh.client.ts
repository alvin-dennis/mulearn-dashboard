let inFlight: Promise<string | null> | null = null;

/**
 * Refresh the access token via the same-origin /api/auth/refresh/session
 * route (D6) — it reads the (possibly httpOnly, for OIDC sessions) refresh
 * cookie server-side, so the browser never needs to read or hold it.
 *
 * Single-flight (D7): concurrent callers (two tabs, a prefetch firing
 * alongside a real navigation) share one in-flight request instead of each
 * sending their own. The provider revokes the ENTIRE session if the same
 * refresh token is presented twice — two simultaneous refreshes would be
 * exactly that.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (inFlight) return inFlight;

  inFlight = doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/refresh/session", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.accessToken ?? null;
  } catch {
    return null;
  }
}
