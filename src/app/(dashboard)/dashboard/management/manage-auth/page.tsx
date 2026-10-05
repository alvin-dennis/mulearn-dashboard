import {
  ChevronLeft,
  ChevronRight,
  Gauge,
  KeyRound,
  ListChecks,
  type LucideIcon,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Authentication Configuration | Management",
  description:
    "Security posture, connected apps, sign-in policy, login attempts, and session revocation for Sign in with μLearn.",
};

interface AuthConfigItem {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  iconBg: string;
}

const AUTH_CONFIG_ITEMS: AuthConfigItem[] = [
  {
    title: "Security Posture",
    description: "Overview of the current OIDC sign-in security state.",
    href: "/dashboard/management/manage-auth/security-posture",
    icon: Gauge,
    iconBg: "bg-chart-2/15 text-chart-2",
  },
  {
    title: "Connected Apps",
    description:
      "View, create, and disable OAuth clients registered on authserver.",
    href: "/dashboard/management/manage-auth/clients",
    icon: KeyRound,
    iconBg: "bg-primary/15 text-primary",
  },
  {
    title: "Sign-in Policy",
    description: "Configure sign-in throttling and policy settings.",
    href: "/dashboard/management/manage-auth/signin-policy",
    icon: Settings2,
    iconBg: "bg-chart-5/15 text-chart-5",
  },
  {
    title: "Login Attempts",
    description: "Audit log of recent sign-in attempts, filterable by result.",
    href: "/dashboard/management/manage-auth/login-attempts",
    icon: ListChecks,
    iconBg: "bg-chart-1/15 text-chart-1",
  },
  {
    title: "Revoke Sessions",
    description: "Force sign-out a member's active sessions.",
    href: "/dashboard/management/manage-auth/sessions",
    icon: ShieldAlert,
    iconBg: "bg-destructive/15 text-destructive",
  },
];

export default async function ManageAuthPage() {
  await requireRole(ADMIN_ROLES);

  return (
    <div className="space-y-8 py-6">
      <div className="space-y-4">
        <Link
          href="/dashboard/management"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Management
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Authentication Configuration
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage "Sign in with μLearn" — connected apps, sign-in policy, login
            attempts, and session revocation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AUTH_CONFIG_ITEMS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-inset hover:ring-border"
          >
            <div className="flex flex-1 flex-col gap-3 p-5 pt-6">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.iconBg} transition-transform duration-200 group-hover:scale-105`}
              >
                <card.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold leading-snug text-foreground">
                  {card.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {card.description}
                </p>
              </div>
              <div className="flex items-center justify-end">
                <ChevronRight
                  className="h-4 w-4 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground"
                  strokeWidth={2}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
