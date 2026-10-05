import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SecurityPostureCard } from "@/features/manage-auth";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Security Posture | Authentication Configuration",
  description: "Overview of the current OIDC sign-in security state.",
};

export default async function SecurityPosturePage() {
  await requireRole(ADMIN_ROLES);

  return (
    <div className="space-y-8 py-6">
      <div className="space-y-4">
        <Link
          href="/dashboard/management/manage-auth"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Authentication Configuration
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Security Posture
          </h1>
          <p className="mt-1 text-muted-foreground">
            Current state of the "Sign in with μLearn" OIDC setup.
          </p>
        </div>
      </div>

      <SecurityPostureCard />
    </div>
  );
}
