import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ClientsTable } from "@/features/manage-auth";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Connected Apps | Authentication Configuration",
  description:
    "View, create, and disable OAuth clients registered on authserver.",
};

export default async function AuthClientsPage() {
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
      <ClientsTable />
    </div>
  );
}
