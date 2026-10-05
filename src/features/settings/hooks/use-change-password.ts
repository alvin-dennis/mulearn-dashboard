"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { changePassword } from "@/features/settings";
import { getApiResponseError } from "@/hooks/use-get-error";
import { authStore, postLogout } from "@/lib/auth";

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
    onSuccess: async (res: unknown) => {
      const data = res as { message?: { general?: string[] } };
      const msg = data.message?.general?.[0] || "Password changed successfully";

      // Backend revokes every session (including this one) on password
      // change. If revocation partially fails, it still returns success —
      // the password DID change — with a message starting "Password
      // changed, but existing sessions could not be signed out…". That's a
      // warning, not a failure, but it still means the old session is
      // (mostly) dead, so we force the same re-auth either way (D10).
      const partialRevocationFailure = /^password changed, but/i.test(msg);
      if (partialRevocationFailure) {
        toast.warning(msg);
      } else {
        toast.success(`${msg} Please sign in again with your new password.`);
      }

      const nextUrl = await postLogout();
      await authStore.clearTokens();
      window.location.href = nextUrl;
    },
    onError: (error) => {
      toast.error(
        getApiResponseError(error, {
          fallback: "Something went wrong. Please try again.",
        }),
      );
    },
  });
}
