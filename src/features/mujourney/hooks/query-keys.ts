/**
 * MuJourney Query Keys
 *
 * 📍 src/features/mujourney/hooks/query-keys.ts
 *
 * Centralized query keys for TanStack Query
 */

export const mujourneyKeys = {
  all: ["mujourney"] as const,

  // Unified task list (redesigned API)
  taskList: (igId?: string) =>
    [...mujourneyKeys.all, "task-list", igId ?? "public"] as const,

  // Public journey (for [muid] page)
  publicUserJourney: (muid: string) =>
    [...mujourneyKeys.all, "public-journey", muid] as const,

  // Interest groups (for IG pill labels)
  interestGroups: () => [...mujourneyKeys.all, "interest-groups"] as const,

  // User level feed (for progress bar)
  userLevelFeed: () => [...mujourneyKeys.all, "user-level-feed"] as const,
} as const;
