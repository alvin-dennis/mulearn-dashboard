import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * OIDC_* vars are individually optional — the flag defaults OFF and the
 * legacy auth path needs none of them. The superRefine below makes them
 * required TOGETHER once OIDC_ENABLED=true, so a bad deploy fails at build
 * time instead of at sign-in (plan doc D12).
 */
export const env = createEnv({
  /*
   * Server-side environment variables
   * ❗ These are NOT exposed to the browser
   */
  server: {
    BACKEND_URL: z.string().url().optional(),
    OIDC_ENABLED: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    /** e.g. https://app.mulearn.org/api/auth/oidc/callback — fixed, never derived from the request (D4). */
    OIDC_REDIRECT_URI: z.string().url().optional(),
  },

  client: {
    NEXT_PUBLIC_DJANGO_API_URL: z.string().url(),
    NEXT_PUBLIC_DISCORD_AUTH_URL: z.string().url(),
    NEXT_PUBLIC_OIDC_ISSUER: z.string().url().optional(),
    NEXT_PUBLIC_OIDC_CLIENT_ID: z.string().min(1).optional(),
  },

  runtimeEnv: {
    BACKEND_URL: process.env.BACKEND_URL,
    OIDC_ENABLED: process.env.OIDC_ENABLED,
    OIDC_REDIRECT_URI: process.env.OIDC_REDIRECT_URI,
    NEXT_PUBLIC_DJANGO_API_URL: process.env.NEXT_PUBLIC_DJANGO_API_URL,
    NEXT_PUBLIC_DISCORD_AUTH_URL: process.env.NEXT_PUBLIC_DISCORD_AUTH_URL,
    NEXT_PUBLIC_OIDC_ISSUER: process.env.NEXT_PUBLIC_OIDC_ISSUER,
    NEXT_PUBLIC_OIDC_CLIENT_ID: process.env.NEXT_PUBLIC_OIDC_CLIENT_ID,
  },

  /** Required together once OIDC_ENABLED=true; absent is fine while it's off. */
  emptyStringAsUndefined: true,

  /*
   * Skip validation during build (optional)
   * Useful in CI or Docker
   */
  skipValidation: false,
});

if (env.OIDC_ENABLED) {
  const missing = [
    !process.env.OIDC_REDIRECT_URI && "OIDC_REDIRECT_URI",
    !process.env.NEXT_PUBLIC_OIDC_ISSUER && "NEXT_PUBLIC_OIDC_ISSUER",
    !process.env.NEXT_PUBLIC_OIDC_CLIENT_ID && "NEXT_PUBLIC_OIDC_CLIENT_ID",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(
      `OIDC_ENABLED=true requires ${missing.join(", ")} to also be set.`,
    );
  }
}
