import { getBaseUrl } from "./base-url.server";

/** Backend/Redis hiccup (503) or network failure — session may still be good. */
export class LegacyRefreshTemporary extends Error {}

/**
 * @throws LegacyRefreshTemporary on 503 (backend's Redis down) or network
 *   failure — the caller should keep the session rather than clear it (D5).
 * @returns the new access token, or null when the backend actually rejected
 *   the refresh token (session is dead).
 */
export async function refreshAccessTokenServer(
  refreshToken: string,
): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(`${getBaseUrl()}/api/v1/auth/get-access-token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
  } catch {
    throw new LegacyRefreshTemporary("backend unreachable");
  }
  if (res.status === 503) {
    throw new LegacyRefreshTemporary(`backend returned ${res.status}`);
  }
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.response?.accessToken ?? null;
}
