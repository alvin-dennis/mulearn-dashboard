import { apiClient } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import {
  type AuthClient,
  AuthClientCreateResponseSchema,
  AuthClientDetailResponseSchema,
  AuthClientListResponseSchema,
  GenericMutationResponseSchema,
  type LoginAttemptFilters,
  LoginAttemptListResponseSchema,
  type RevokeSessionFormValues,
  RevokeSessionResponseSchema,
  SecurityPostureResponseSchema,
  type SigninPolicy,
  SigninPolicyResponseSchema,
} from "../schemas";

// ─── Security Posture ──────────────────────────────────────────────────────

export async function fetchSecurityPosture() {
  const res = await apiClient.get(
    endpoints.authAdmin.securityPosture,
    SecurityPostureResponseSchema,
  );
  return res.response;
}

// ─── Connected Apps (OAuth clients) ────────────────────────────────────────

export async function fetchAuthClients() {
  const res = await apiClient.get(
    endpoints.authAdmin.clients,
    AuthClientListResponseSchema,
  );
  return res.response;
}

export async function fetchAuthClientDetail(clientId: string) {
  const res = await apiClient.get(
    endpoints.authAdmin.clientDetail(clientId),
    AuthClientDetailResponseSchema,
  );
  return res.response;
}

/** The returned `client_secret` is shown exactly once — never retrievable again. */
export async function createAuthClient(payload: {
  name: string;
  redirect_uris: string;
  client_type: string;
}) {
  const res = await apiClient.post(
    endpoints.authAdmin.clients,
    payload,
    AuthClientCreateResponseSchema,
  );
  return res.response;
}

export async function updateAuthClient(
  clientId: string,
  payload: { name: string; redirect_uris: string },
) {
  const res = await apiClient.patch(
    endpoints.authAdmin.clientDetail(clientId),
    payload,
    AuthClientDetailResponseSchema,
  );
  return res.response;
}

export async function disableAuthClient(
  clientId: string,
  payload: { reason?: string },
): Promise<AuthClient> {
  const res = await apiClient.post(
    endpoints.authAdmin.clientDisable(clientId),
    payload,
    AuthClientDetailResponseSchema,
  );
  return res.response;
}

export async function enableAuthClient(
  clientId: string,
  payload: { reason?: string },
): Promise<AuthClient> {
  const res = await apiClient.post(
    endpoints.authAdmin.clientEnable(clientId),
    payload,
    AuthClientDetailResponseSchema,
  );
  return res.response;
}

// ─── Sign-in Policy ────────────────────────────────────────────────────────

export async function fetchSigninPolicy() {
  const res = await apiClient.get(
    endpoints.authAdmin.signinPolicy,
    SigninPolicyResponseSchema,
  );
  return res.response;
}

export async function updateSigninPolicy(policy: SigninPolicy) {
  const res = await apiClient.put(
    endpoints.authAdmin.signinPolicy,
    policy,
    SigninPolicyResponseSchema,
  );
  return res.response;
}

// ─── Login Attempts ────────────────────────────────────────────────────────

export async function fetchLoginAttempts(filters: LoginAttemptFilters) {
  const query = new URLSearchParams();
  if (filters.identifier) query.set("identifier", filters.identifier);
  if (filters.result) query.set("result", filters.result);
  if (filters.before) query.set("before", filters.before);
  if (filters.limit) query.set("limit", String(Math.min(filters.limit, 200)));

  const res = await apiClient.get(
    `${endpoints.authAdmin.loginAttempts}?${query.toString()}`,
    LoginAttemptListResponseSchema,
  );
  return res.response;
}

// ─── Sessions ──────────────────────────────────────────────────────────────

/**
 * 404 "Member not found" and 503 "Sessions were only partly revoked. Try
 * again." are both ordinary ApiErrors here — the caller's onError surfaces
 * them via getApiResponseError, nothing special needed on this side.
 */
export async function revokeMemberSessions(values: RevokeSessionFormValues) {
  const payload =
    values.identifierType === "user_id"
      ? { user_id: values.identifier, reason: values.reason }
      : { muid: values.identifier, reason: values.reason };

  const res = await apiClient.post(
    endpoints.authAdmin.sessionsRevoke,
    payload,
    RevokeSessionResponseSchema,
  );
  return res.response;
}

// Re-exported for callers that only need the mutation response shape.
export { GenericMutationResponseSchema };
