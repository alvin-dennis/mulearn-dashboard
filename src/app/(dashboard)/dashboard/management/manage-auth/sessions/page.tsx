import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RevokeSessionForm } from "@/features/manage-auth";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Revoke Sessions | Authentication Configuration",
  description: "Force sign-out a member's active sessions.",
};

export default async function RevokeSessionsPage() {
  await requireRole(ADMIN_ROLES);

  return (
    <div className="space-y-6 py-6">
      <Link
        href="/dashboard/management/manage-auth"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Authentication Configuration
      </Link>
      <RevokeSessionForm />
    </div>
  );
}
