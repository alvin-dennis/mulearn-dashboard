/**
 * Manage Auth Feature Barrel — "Sign in with μLearn" admin console (D11)
 *
 * 📍 src/features/manage-auth/index.ts
 */

export {
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
} from "./api";
export {
  ClientDetailDialog,
  ClientsTable,
  CreateClientDialog,
  LoginAttemptsTable,
  RevokeSessionForm,
  SecurityPostureCard,
  SigninPolicyForm,
} from "./components";
export {
  manageAuthKeys,
  useAuthClientDetail,
  useAuthClients,
  useCreateAuthClient,
  useDisableAuthClient,
  useEnableAuthClient,
  useLoginAttempts,
  useRevokeMemberSessions,
  useSecurityPosture,
  useSigninPolicy,
  useUpdateAuthClient,
  useUpdateSigninPolicy,
} from "./hooks";
export type {
  AuthClient,
  AuthClientCreate,
  CreateClientFormValues,
  DisableClientFormValues,
  LoginAttempt,
  LoginAttemptFilters,
  RevokeSessionFormValues,
  SecurityPosture,
  SigninPolicy,
  UpdateClientFormValues,
} from "./schemas";
