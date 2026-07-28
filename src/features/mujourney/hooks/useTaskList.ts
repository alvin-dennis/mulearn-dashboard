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
import { mujourneyKeys } from "./query-keys";
import type { TaskListResponse } from "../schemas";

interface UseTaskListOptions {
  igId?: string;
  initialData?: TaskListResponse | null;
}

/**
 * Hook for fetching the unified grouped task list.
 * @param igId - Optional IG UUID to filter become_expert tasks to a specific IG
 * @param initialData - Optional SSR pre-fetched data
 */
export function useTaskList({ igId, initialData }: UseTaskListOptions = {}) {
  const isAuthenticated = authStore.isAuthenticated();

  return useQuery({
    queryKey: mujourneyKeys.taskList(igId),
    queryFn: () => fetchTaskList(igId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Allow both authenticated and unauthenticated fetches
    enabled: true,
    placeholderData: (prev) => prev, // keep showing previous data while refetching (IG switch)
    initialData: initialData ?? undefined,
  });
}
