/**
 * useTaskList Hook
 *
 * 📍 src/features/mujourney/hooks/useTaskList.ts
 *
 * Unified hook for the redesigned task list API.
 * Replaces the old useStartLearning / usePublicLevels / useIGTasks hooks.
 *
 * - Unauthenticated callers: start_journey only; become_expert and events are []
 * - Authenticated callers: all three sections
 * - Pass igId to filter become_expert to a specific Interest Group
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { authStore } from "@/lib/auth";
import { fetchTaskList } from "../api";
import type { TaskListResponse } from "../schemas";
import { mujourneyKeys } from "./query-keys";

interface UseTaskListOptions {
  igId?: string;
  initialData?: TaskListResponse | null;
  authenticated?: boolean;
}

/**
 * Hook for fetching the unified grouped task list.
 * @param igId - Optional IG UUID to filter become_expert tasks to a specific IG
 * @param initialData - Optional SSR pre-fetched data
 * @param authenticated - Whether to send Bearer token. Defaults to authStore check.
 */
export function useTaskList({
  igId,
  initialData,
  authenticated = authStore.isAuthenticated(),
}: UseTaskListOptions = {}) {
  return useQuery({
    queryKey: mujourneyKeys.taskList(igId),
    queryFn: () => fetchTaskList(igId, authenticated),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
    placeholderData: (prev) => prev, // keep showing previous data while refetching (IG switch)
    initialData: initialData ?? undefined,
  });
}
