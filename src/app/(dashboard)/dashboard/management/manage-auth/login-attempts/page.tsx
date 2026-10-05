import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LoginAttemptsTable } from "@/features/manage-auth";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Login Attempts | Authentication Configuration",
  description: "Audit log of recent sign-in attempts, filterable by result.",
};

export default async function LoginAttemptsPage() {
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
      <LoginAttemptsTable />
    </div>
  );
}
