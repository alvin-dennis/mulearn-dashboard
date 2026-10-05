/**
 * Register Page
 *
 * 📍 src/app/(auth)/register/page.tsx
 */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RegisterClient } from "./register-client";

export const metadata: Metadata = {
  title: "Create Account | μLearn",
  description: "Create your μLearn account and start learning",
};

interface RegisterPageProps {
  searchParams: Promise<{
    ruri?: string;
    referral_id?: string;
    email?: string;
    fullName?: string;
  }>;
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const tempToken = cookieStore.get("tempToken")?.value || null;

  /**
   * D9 — when the provider is live, new signups happen on auth.mulearn.org
   * too, not just logins. Only a fresh visit redirects: a Google-signup
   * `tempToken` means this person is already mid-flow (picking a role after
   * the legacy Google OAuth path) and must finish here, not get bounced to
   * the provider mid-step.
   */
  if (process.env.OIDC_ENABLED === "true" && !tempToken) {
    const query = new URLSearchParams({ signup: "1" });
    if (params.ruri) query.set("ruri", params.ruri);
    redirect(`/api/auth/oidc/start?${query}`);
  }

  return (
    <RegisterClient
      redirectUri={params.ruri}
      referralId={params.referral_id}
      email={params.email}
      fullName={params.fullName}
      initialTempToken={tempToken}
    />
  );
}
