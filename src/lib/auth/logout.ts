/**
 * Shared logout call.
 *
 * 📍 src/lib/auth/logout.ts
 *
 * POSTs /api/auth/logout and returns where the browser should go next. When
 * the session was an OIDC one, that route also builds an RP-initiated
 * `/oauth/logout/` URL (D2) — following it is what actually ends the
 * authserver session, not just this app's. Skipping it (falling back to
 * `/login` unconditionally) would leave the provider session alive and the
 * next sign-in would walk straight back in with no password prompt.
 */
export async function postLogout(): Promise<string> {
  try {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    const data = (await res.json().catch(() => null)) as {
      logoutUrl?: string | null;
    } | null;
    return data?.logoutUrl || "/login";
  } catch {
    return "/login";
  }
}
