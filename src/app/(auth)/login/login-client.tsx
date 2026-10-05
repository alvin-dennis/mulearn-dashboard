/**
 * Login Client Component
 *
 * 📍 src/app/(auth)/login/login-client.tsx
 *
 * Client component with all login logic.
 * Uses TanStack Query hooks for data mutations.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  LoginForm,
  OTPLoginForm,
  useLoginWithOTP,
  useLoginWithPassword,
  useRequestOTP,
} from "@/features/auth";
import { sanitizeReturnPath } from "@/lib/auth/return-path";

interface LoginClientProps {
  redirectUri?: string;
  error?: string;
  loggedOut?: boolean;
  oidcEnabled?: boolean;
}

/** D8 — one friendly message per callback failure reason, never the raw provider text. */
const ERROR_MESSAGES: Record<string, string> = {
  signin_expired:
    "Your sign-in took too long or was started in another tab. Please try again.",
  signin_mismatch:
    "Your sign-in took too long or was started in another tab. Please try again.",
  signin_unavailable:
    "Sign-in is temporarily unavailable. Please try again in a moment.",
  signin_failed: "We could not sign you in. Please try again.",
};

export function LoginClient({
  redirectUri,
  error,
  loggedOut,
  oidcEnabled,
}: LoginClientProps) {
  const router = useRouter();
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");

  const loginWithPassword = useLoginWithPassword();
  const loginWithOTP = useLoginWithOTP();
  const requestOTP = useRequestOTP();

  // `ruri` arrives from the URL, so it is attacker-controllable — sanitize
  // before redirecting. The sanitizer keeps the query string, which is what
  // carries an OAuth `?code=` back to /dashboard/connect-discord after a
  // login detour.
  const getRedirectPath = () => {
    if (redirectUri && redirectUri !== "noredirect") {
      return `/${sanitizeReturnPath(redirectUri)}`;
    }
    return "/dashboard";
  };

  const handlePasswordLogin = async (values: {
    emailOrMuid: string;
    password: string;
  }) => {
    try {
      await loginWithPassword.mutateAsync(values);
      toast.success("Welcome back!");
      router.push(getRedirectPath());
    } catch {}
  };

  const handleRequestOTP = async (emailOrMuid: string) => {
    await requestOTP.mutateAsync(emailOrMuid);
    toast.success("OTP sent to your email!");
  };

  const handleVerifyOTP = async (emailOrMuid: string, otp: string) => {
    try {
      await loginWithOTP.mutateAsync({ emailOrMuid, otp });
      toast.success("Welcome back!");
      router.push(getRedirectPath());
    } catch {}
  };

  // D8/D2: rendered instead of the form when the page declined to
  // auto-redirect to the provider (see page.tsx) — a persistent provider
  // error or a just-completed sign-out, either of which must stop at an
  // explicit button rather than looping or silently re-authenticating.
  if (oidcEnabled && (error || loggedOut)) {
    const signInHref = redirectUri
      ? `/api/auth/oidc/start?${new URLSearchParams({ ruri: redirectUri })}`
      : "/api/auth/oidc/start";
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-muted-foreground">
          {error
            ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.signin_failed)
            : "You are signed out."}
        </p>
        <Button onClick={() => router.push(signInHref)}>Sign in</Button>
      </div>
    );
  }

  if (loginMode === "otp") {
    return (
      <OTPLoginForm
        onRequestOTP={handleRequestOTP}
        onVerifyOTP={handleVerifyOTP}
        isRequestingOTP={requestOTP.isPending}
        isVerifying={loginWithOTP.isPending}
        onSwitchToPassword={() => setLoginMode("password")}
      />
    );
  }

  return (
    <LoginForm
      onSubmit={handlePasswordLogin}
      isLoading={loginWithPassword.isPending}
      onSwitchToOTP={() => setLoginMode("otp")}
    />
  );
}
