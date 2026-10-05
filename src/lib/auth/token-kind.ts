/**
 * Refresh-token kind detection.
 *
 * 📍 src/lib/auth/token-kind.ts
 *
 * Flipping OIDC_ENABLED doesn't retroactively convert already-issued tokens:
 * a user signed in under the legacy flow still holds a legacy refresh token
 * after the flag flips ON, and sending it to authserver's /oauth/token/ gets
 * `invalid_grant` → logged out. So refresh/logout must branch on the TOKEN
 * itself, not on the flag — the flag only decides where a NEW sign-in goes.
 *
 * Discriminator: legacy refresh tokens are this repo's own HS256 JWTs (3
 * dot-separated parts). django-oauth-toolkit (confirmed via the
 * oauth2_provider_* tables in mulearnbackend's settings.py on feat/new-auth)
 * issues OIDC refresh tokens as opaque random strings with no dots, even
 * though its *access* tokens are RS256 JWTs. So "has 3 parts" is a safe
 * legacy/OIDC split for the REFRESH token specifically — unlike access
 * tokens, where both legacy (HS256) and OIDC (RS256) are 3-part JWTs and dot-
 * count alone can't tell them apart.
 *
 * If this repo's OIDC client is ever reconfigured to issue JWT refresh
 * tokens, this heuristic breaks silently — re-verify against the real
 * /oauth/token/ response shape first (see
 * docs/sign-in-with-mulearn-backend-verification.md §8).
 */
export function isLegacyRefreshToken(token: string): boolean {
  return token.split(".").length === 3;
}
