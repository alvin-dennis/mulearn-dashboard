/**
 * Public User Journey Page (Client Component)
 *
 * View another user's public journey.
 *
 * Uses redesigned task list API (useTaskList) for available tasks,
 * merged with user's journey progress (completed status) from useUserJourney.
 */

"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { JourneyHeader, LevelCard } from "@/features/mujourney";
import { useTaskList } from "@/features/mujourney/hooks";
import { useUserJourney } from "@/features/mujourney/hooks";
import type { TaskListPublic } from "@/features/mujourney/schemas";

interface PublicUserJourneyPageClientProps {
  muid: string;
}

export function PublicUserJourneyPageClient({
  muid,
}: PublicUserJourneyPageClientProps) {
  const {
    data: journeyData,
    isLoading: journeyLoading,
    error: journeyError,
  } = useUserJourney(muid);
  const { data: taskListData, isLoading: taskListLoading } = useTaskList();

  // New format: response is an array of JourneyLevelSchema directly
  const levels = journeyData?.response ?? [];

  // Build a set of completed task hashtags from the user's journey data
  const completedTaskHashtags = useMemo(() => {
    const hashtags = new Set<string>();
    levels.forEach((level: any) => {
      (level.tasks || []).forEach((task: any) => {
        if (task.completed && task.hashtag) {
          hashtags.add(task.hashtag);
        }
      });
    });
    return hashtags;
  }, [levels]);

  // Merge start_journey tasks with completion status from journey data
  const startJourneyTasks = useMemo(() => {
    if (!taskListData?.response?.start_journey) return [];
    return taskListData.response.start_journey.map((task: TaskListPublic) => ({
      ...task,
      completed: completedTaskHashtags.has(task.hashtag || ""),
    }));
  }, [taskListData, completedTaskHashtags]);

  // Group start_journey tasks by level.name for LevelCard display
  const groupedStartJourney = useMemo(() => {
    const map = new Map<string, TaskListPublic[]>();
    startJourneyTasks.forEach((task) => {
      const key = task.level ?? "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    return Array.from(map.entries()).map(([name, tasks]) => ({
      name,
      tasks,
    }));
  }, [startJourneyTasks]);

  // For authenticated viewers, also show become_expert and events sections
  const becomeExpertTasks = taskListData?.response?.become_expert ?? [];
  const eventsTasks = taskListData?.response?.events ?? [];

  // Group become_expert tasks by level
  const groupedBecomeExpert = useMemo(() => {
    const map = new Map<string, TaskListPublic[]>();
    becomeExpertTasks.forEach((task) => {
      const key = task.level ?? "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    return Array.from(map.entries()).map(([name, tasks]) => ({
      name,
      tasks,
    }));
  }, [becomeExpertTasks]);

  // Group events tasks by level
  const groupedEvents = useMemo(() => {
    const map = new Map<string, TaskListPublic[]>();
    eventsTasks.forEach((task) => {
      const key = task.level ?? "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    return Array.from(map.entries()).map(([name, tasks]) => ({
      name,
      tasks,
    }));
  }, [eventsTasks]);

  const isLoading = journeyLoading || taskListLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="text-muted-foreground">Loading journey...</p>
        </div>
      </div>
    );
  }

  if (journeyError || !journeyData?.response) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-destructive">Failed to load journey</p>
          <p className="text-sm text-muted-foreground">
            {journeyError?.message || "User journey not found"}
          </p>
          <Button asChild>
            <Link href="/dashboard/mujourney">Back to MuJourney</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Use muid prop as display name (full_name no longer in API response)
  const displayName = decodeURIComponent(muid) || muid;

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/dashboard/mujourney" className="gap-2">
          <ArrowLeft className="size-4" />
          Back to MuJourney
        </Link>
      </Button>

      {/* Header */}
      <JourneyHeader title={`${displayName}'s Journey`} subtitle={``} />

      {/* Start Journey — available tasks with completion status */}
      <div className="space-y-8">
        <JourneyHeader
          title="Available Tasks"
          subtitle="Tasks available to start"
        />
        {groupedStartJourney.length > 0 ? (
          groupedStartJourney.map((level) => (
            <LevelCard
              key={level.name}
              name={level.name}
              tasks={level.tasks}
              isLocked={false}
            />
          ))
        ) : (
          <p className="text-muted-foreground">No tasks available yet.</p>
        )}
      </div>

      {/* Become Expert — shown if non-empty (API returns empty for unauthenticated) */}
      {groupedBecomeExpert.length > 0 && (
        <div className="space-y-8">
          <JourneyHeader
            title="Advanced Tasks"
            subtitle="Interest group and company tasks"
          />
          {groupedBecomeExpert.map((level) => (
            <LevelCard
              key={level.name}
              name={level.name}
              tasks={level.tasks}
              isLocked={false}
            />
          ))}
        </div>
      )}

      {/* Events — shown if non-empty (API returns empty for unauthenticated) */}
      {groupedEvents.length > 0 && (
        <div className="space-y-8">
          <JourneyHeader title="Event Tasks" subtitle="Event-linked tasks" />
          {groupedEvents.map((level) => (
            <LevelCard
              key={level.name}
              name={level.name}
              tasks={level.tasks}
              isLocked={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
