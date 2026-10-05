export const manageAuthKeys = {
  all: ["manage-auth"] as const,
  securityPosture: () => [...manageAuthKeys.all, "security-posture"] as const,
  clients: () => [...manageAuthKeys.all, "clients"] as const,
  clientDetail: (id: string) => [...manageAuthKeys.clients(), id] as const,
  signinPolicy: () => [...manageAuthKeys.all, "signin-policy"] as const,
  loginAttempts: (filters: {
    identifier?: string;
    result?: string;
    before?: string;
    limit?: number;
  }) => [...manageAuthKeys.all, "login-attempts", filters] as const,
};
