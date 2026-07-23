/**
 * Tour Types
 *
 * 📍 src/features/tour/types.ts
 */

import type { Permission } from "@/lib/auth/permissions";

export type TourKey = "dashboard" | "intern" | "campus" | "zonal" | "district";

export type TourOutcome = "completed" | "skipped";

export interface TourState {
  version: number;
  outcome: TourOutcome;
}

export type TourCookiePayload = Partial<Record<TourKey, TourState>>;

/**
 * Context passed to a step's `requiresFlag` check. Mirrors what
 * `useFilteredNav`/`usePermissions` already compute client-side — the tour
 * reuses those instead of re-deriving role/verification state.
 */
export interface TourStepContext {
  roles: readonly string[];
  can: (permission: Permission) => boolean;
  isMentorVerified: boolean;
  isCompanyVerified: boolean;
}

export interface TourStep {
  /** Unique step id (used as React key / debug label, not a DOM selector). */
  id: string;
  /** Matches `NAV_ITEMS[].id` from `src/lib/nav-config.ts`. */
  navId: string;
  title: string;
  description: string;
  /** Visible only if the user holds at least one of these roles. */
  requiresRole?: readonly string[];
  /** Visible only if this returns true. Evaluated in addition to `requiresRole`. */
  requiresFlag?: (ctx: TourStepContext) => boolean;
  /**
   * No sidebar element is highlighted — shown as a plain centered card over
   * whatever page it launches on (welcome/finish bookends). On mobile this
   * also means the off-canvas sidebar sheet is kept/left closed for it,
   * rather than opened just to point at the Home icon.
   */
  centered?: boolean;
}
