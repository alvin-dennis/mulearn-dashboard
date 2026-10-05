"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiResponseError } from "@/hooks/use-get-error";
import {
  createAuthClient,
  disableAuthClient,
  enableAuthClient,
  fetchAuthClientDetail,
  fetchAuthClients,
  fetchLoginAttempts,
  fetchSecurityPosture,
  fetchSigninPolicy,
  revokeMemberSessions,
  updateAuthClient,
  updateSigninPolicy,
} from "../api";
import type {
  LoginAttemptFilters,
  RevokeSessionFormValues,
  SigninPolicy,
} from "../schemas";
import { manageAuthKeys } from "./query-keys";

// ─── Queries ──────────────────────────────────────────────────────────────

export function useSecurityPosture() {
  return useQuery({
    queryKey: manageAuthKeys.securityPosture(),
    queryFn: fetchSecurityPosture,
    staleTime: 60 * 1000,
  });
}

export function useAuthClients() {
  return useQuery({
    queryKey: manageAuthKeys.clients(),
    queryFn: fetchAuthClients,
    staleTime: 60 * 1000,
  });
}

export function useAuthClientDetail(clientId: string | null) {
  return useQuery({
    queryKey: manageAuthKeys.clientDetail(clientId ?? ""),
    queryFn: () => fetchAuthClientDetail(clientId ?? ""),
    enabled: !!clientId,
    staleTime: 60 * 1000,
  });
}

export function useSigninPolicy() {
  return useQuery({
    queryKey: manageAuthKeys.signinPolicy(),
    queryFn: fetchSigninPolicy,
    staleTime: 60 * 1000,
  });
}

export function useLoginAttempts(filters: LoginAttemptFilters) {
  return useQuery({
    queryKey: manageAuthKeys.loginAttempts(filters),
    queryFn: () => fetchLoginAttempts(filters),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

export function useCreateAuthClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAuthClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: manageAuthKeys.clients() });
    },
    onError: (error) => {
      toast.error(
        getApiResponseError(error, { fallback: "Failed to create client." }),
      );
    },
  });
}

export function useUpdateAuthClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      clientId,
      payload,
    }: {
      clientId: string;
      payload: { name: string; redirect_uris: string };
    }) => updateAuthClient(clientId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: manageAuthKeys.clients() });
      queryClient.invalidateQueries({
        queryKey: manageAuthKeys.clientDetail(variables.clientId),
      });
      toast.success("Client updated successfully.");
    },
    onError: (error) => {
      toast.error(
        getApiResponseError(error, { fallback: "Failed to update client." }),
      );
    },
  });
}

export function useDisableAuthClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, reason }: { clientId: string; reason?: string }) =>
      disableAuthClient(clientId, { reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: manageAuthKeys.clients() });
      queryClient.invalidateQueries({
        queryKey: manageAuthKeys.clientDetail(variables.clientId),
      });
      toast.success("Client disabled.");
    },
    onError: (error) => {
      toast.error(
        getApiResponseError(error, { fallback: "Failed to disable client." }),
      );
    },
  });
}

export function useEnableAuthClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, reason }: { clientId: string; reason?: string }) =>
      enableAuthClient(clientId, { reason }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: manageAuthKeys.clients() });
      queryClient.invalidateQueries({
        queryKey: manageAuthKeys.clientDetail(variables.clientId),
      });
      toast.success("Client enabled.");
    },
    onError: (error) => {
      toast.error(
        getApiResponseError(error, { fallback: "Failed to enable client." }),
      );
    },
  });
}

export function useUpdateSigninPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (policy: SigninPolicy) => updateSigninPolicy(policy),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: manageAuthKeys.signinPolicy(),
      });
      toast.success("Sign-in policy updated.");
    },
    onError: (error) => {
      toast.error(
        getApiResponseError(error, {
          fallback: "Failed to update sign-in policy.",
        }),
      );
    },
  });
}

export function useRevokeMemberSessions() {
  return useMutation({
    mutationFn: (values: RevokeSessionFormValues) =>
      revokeMemberSessions(values),
    onSuccess: () => {
      // 503 "Sessions were only partly revoked" is thrown as an ApiError by
      // the backend (not a 2xx), so onSuccess here only fires on full success.
      toast.success("Sessions revoked.");
    },
    onError: (error) => {
      toast.error(
        getApiResponseError(error, {
          fallback: "Failed to revoke sessions.",
        }),
      );
    },
  });
}
