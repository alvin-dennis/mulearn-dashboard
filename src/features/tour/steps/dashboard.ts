/**
 * Dashboard Tour Steps
 *
 * 📍 src/features/tour/steps/dashboard.ts
 *
 * Tour key: `dashboard` — Student, Pre Member, Fellow, Mentor, Company,
 * IG Lead, plain Enabler (§5.1-§5.4, §5.6's Enabler note).
 */

import { hasIgLeadRole, ROLES } from "@/lib/auth/roles";
import type { TourStep } from "../types";
import {
  baseNavSteps,
  finishStep,
  manageEventsStep,
  welcomeStep,
} from "./shared";

export const dashboardSteps: TourStep[] = [
  welcomeStep,
  ...baseNavSteps,

  // Mentor / Company shared step (§5.2, §5.3)
  {
    id: "talent-pool",
    navId: "talent-pool",
    title: "Talent Pool",
    description:
      "Browse verified learners to mentor, hire, or bring onto your team.",
    requiresRole: [ROLES.MENTOR, ROLES.COMPANY],
  },

  // Mentor-only (§5.2)
  {
    id: "mentor-sessions",
    navId: "mentor-sessions",
    title: "Sessions",
    description: "Schedule and manage your mentoring sessions with mentees.",
    requiresRole: [ROLES.MENTOR],
    requiresFlag: (ctx) => ctx.isMentorVerified,
  },
  {
    id: "mentor-task-requests",
    navId: "mentor-task-requests",
    title: "Task Requests",
    description:
      "Review and respond to task submissions waiting on your approval.",
    requiresRole: [ROLES.MENTOR],
    requiresFlag: (ctx) => ctx.isMentorVerified,
  },
  {
    id: "mentor-mentees",
    navId: "mentor-mentees",
    title: "Mentees",
    description: "See everyone you're mentoring and track their progress.",
    requiresRole: [ROLES.MENTOR],
  },

  // Company-only (§5.3)
  {
    id: "company-jobs",
    navId: "company-jobs",
    title: "Job Management",
    description: "Post openings and manage the jobs your company has listed.",
    requiresRole: [ROLES.COMPANY],
  },
  {
    id: "company-tasks",
    navId: "company-tasks",
    title: "Task Management",
    description: "Create tasks for learners and review their submissions.",
    requiresRole: [ROLES.COMPANY],
  },
  {
    id: "company-mentors",
    navId: "company-mentors",
    title: "Mentor Management",
    description: "Manage the mentors affiliated with your company.",
    requiresRole: [ROLES.COMPANY],
  },
  {
    id: "company-ig-requests",
    navId: "company-ig-requests",
    title: "IG Requests",
    description:
      "Review Interest Group collaboration requests sent to your company.",
    requiresRole: [ROLES.COMPANY],
  },
  {
    id: "company-analytics",
    navId: "company-analytics",
    title: "Analytics & Performance",
    description: "Track hiring, task, and engagement metrics for your company.",
    requiresRole: [ROLES.COMPANY],
  },

  // IG Lead (§5.4) — dynamic "{code} IGLead" roles, not the static IG_LEAD
  // constant, so gated via `hasIgLeadRole` rather than `requiresRole`.
  {
    id: "ig-edit",
    navId: "interest-groups",
    title: "Manage Your Interest Group",
    description: "Edit your group's details and manage its members.",
    requiresFlag: (ctx) => hasIgLeadRole(ctx.roles),
  },
  {
    id: "ig-twitches-manage",
    navId: "weekly-twitches-manage",
    title: "Manage Weekly Twitches",
    description:
      "Create and publish the weekly challenge for your Interest Group.",
    requiresFlag: (ctx) => hasIgLeadRole(ctx.roles),
  },

  manageEventsStep,
  finishStep,
];
