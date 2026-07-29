/**
 * MuJourney Main Page
 *
 * 📍 src/app/(dashboard)/mujourney/page.tsx
 *
 * Server component: prefetches the unified task list for unauthenticated users (SSR).
 * Authenticated users get all three sections client-side via useTaskList.
 */

import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { fetchTaskList } from "@/features/mujourney/api";
import { isAuthenticated } from "@/lib/auth/server";

const MuJourneyDashboard = dynamic(() =>
  import("@/features/mujourney").then((mod) => ({
    default: mod.MuJourneyDashboard,
  })),
);

export const metadata: Metadata = {
  title: "MuJourney",
  description: "Track your learning journey and progress.",
};

export default async function MuJourneyPage() {
  const authenticated = await isAuthenticated();

  // SSR: fetch the task list on the server for both authenticated and
  // unauthenticated users. The API handles auth internally:
  //   - Unauthenticated → start_journey only; become_expert & events are []
  //   - Authenticated   → all three sections
  let initialTaskList = null;

  try {
    const data = await fetchTaskList();
    if (data) {
      initialTaskList = data;
    }
  } catch {
    // Non-fatal: client will refetch via useTaskList on mount
  }

  return (
    <MuJourneyDashboard
      initialTaskList={initialTaskList}
      isAuthenticated={authenticated}
    />
  );
}
