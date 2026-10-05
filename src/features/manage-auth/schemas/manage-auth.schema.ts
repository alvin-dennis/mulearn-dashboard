import { z } from "zod";

/**
 * "Sign in with μLearn" admin console — D11.
 *
 * 📍 src/features/manage-auth/schemas/manage-auth.schema.ts
 *
 * The exact field names on these responses are confirmed only for the route
 * paths themselves (docs/sign-in-with-mulearn-backend-verification.md §5) —
 * the body shapes were not read off the real backend. Every schema here is
 * deliberately loose (`.passthrough()` / `z.record`) so an unexpected or
 * renamed field degrades to "not shown" rather than a hard parse failure
 * that takes the whole screen down. Tighten these once the real response
 * bodies are confirmed.
 */

const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    hasError: z.boolean(),
    statusCode: z.number(),
    message: z.record(z.string(), z.array(z.string())).optional(),
    response: dataSchema,
  });

export const GenericMutationResponseSchema = ApiResponseSchema(
  z.object({}).passthrough(),
);

// ─── Security Posture ──────────────────────────────────────────────────────

/** Unverified shape — rendered generically as a key/value grid, not fixed fields. */
export const SecurityPostureSchema = z.record(z.string(), z.unknown());
export const SecurityPostureResponseSchema = ApiResponseSchema(
  SecurityPostureSchema,
);
export type SecurityPosture = z.infer<typeof SecurityPostureSchema>;

// ─── Connected Apps (OAuth clients) ────────────────────────────────────────

export const AuthClientSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    client_id: z.string().optional(),
    client_type: z.string().optional(),
    redirect_uris: z.union([z.string(), z.array(z.string())]).optional(),
    skip_authorization: z.boolean().optional(),
    is_active: z.boolean().optional(),
    disabled: z.boolean().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

export type AuthClient = z.infer<typeof AuthClientSchema>;

/** Only present once, on the create-client response — never retrievable again. */
export const AuthClientCreateSchema = AuthClientSchema.extend({
  client_secret: z.string().optional(),
});
export type AuthClientCreate = z.infer<typeof AuthClientCreateSchema>;

export const AuthClientListSchema = z
  .object({
    data: z.array(AuthClientSchema).optional(),
    results: z.array(AuthClientSchema).optional(),
    pagination: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()
  .transform((val) => ({
    items: val.data ?? val.results ?? [],
  }));

export const AuthClientListResponseSchema =
  ApiResponseSchema(AuthClientListSchema);
export const AuthClientDetailResponseSchema =
  ApiResponseSchema(AuthClientSchema);
export const AuthClientCreateResponseSchema = ApiResponseSchema(
  AuthClientCreateSchema,
);

export const CreateClientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  redirect_uris: z.string().min(1, "At least one redirect URI is required"),
  client_type: z.enum(["public", "confidential"]),
});
export type CreateClientFormValues = z.infer<typeof CreateClientFormSchema>;

export const UpdateClientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  redirect_uris: z.string().min(1, "At least one redirect URI is required"),
});
export type UpdateClientFormValues = z.infer<typeof UpdateClientFormSchema>;

export const DisableClientFormSchema = z.object({
  reason: z.string().optional(),
});
export type DisableClientFormValues = z.infer<typeof DisableClientFormSchema>;

// ─── Sign-in Policy ────────────────────────────────────────────────────────

/** Unverified shape — edited generically, see SigninPolicyForm. */
export const SigninPolicySchema = z.record(z.string(), z.unknown());
export const SigninPolicyResponseSchema = ApiResponseSchema(SigninPolicySchema);
export type SigninPolicy = z.infer<typeof SigninPolicySchema>;

// ─── Login Attempts ────────────────────────────────────────────────────────

export const LoginAttemptSchema = z
  .object({
    identifier: z.string().optional(),
    result: z.string().optional(),
    ip_address: z.string().nullable().optional(),
    reason: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    timestamp: z.string().nullable().optional(),
  })
  .passthrough();
export type LoginAttempt = z.infer<typeof LoginAttemptSchema>;

export const LoginAttemptListSchema = z
  .object({
    data: z.array(LoginAttemptSchema).optional(),
    results: z.array(LoginAttemptSchema).optional(),
  })
  .passthrough()
  .transform((val) => ({ items: val.data ?? val.results ?? [] }));

export const LoginAttemptListResponseSchema = ApiResponseSchema(
  LoginAttemptListSchema,
);

export const LoginAttemptFiltersSchema = z.object({
  identifier: z.string().optional(),
  result: z.string().optional(),
  before: z.string().optional(),
  limit: z.number().max(200).optional(),
});
export type LoginAttemptFilters = z.infer<typeof LoginAttemptFiltersSchema>;

// ─── Session Revoke ────────────────────────────────────────────────────────

export const RevokeSessionFormSchema = z.object({
  identifierType: z.enum(["user_id", "muid"]),
  identifier: z.string().min(1, "Required"),
  reason: z.string().min(1, "A reason is required"),
});
export type RevokeSessionFormValues = z.infer<typeof RevokeSessionFormSchema>;

export const RevokeSessionResponseSchema = GenericMutationResponseSchema;
