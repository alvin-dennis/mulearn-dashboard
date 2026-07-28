/**
 * Public User Journey Page (Client Component)
 *
 * View another user's public journey.
 * Maps legacy public user journey task format to the new TaskListPublic format for LevelCard compatibility.
 */

"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { JourneyHeader, LevelCard } from "@/features/mujourney";
import { useUserJourney } from "@/features/mujourney/hooks";
import type { TaskListPublic } from "@/features/mujourney/schemas";

interface PublicUserJourneyPageClientProps {
  muid: string;
}

export function PublicUserJourneyPageClient({
  muid,
}: PublicUserJourneyPageClientProps) {
  const { data, isLoading, error } = useUserJourney(muid);

  // Map legacy level and task fields to TaskListPublic shape expected by components
  const mappedLevels = useMemo(() => {
    if (!data?.response?.levels) return [];

    return data.response.levels.map((level: any) => {
      const levelName = level.name || "General";
      const tasks: TaskListPublic[] = (level.tasks || []).map((task: any) => ({
        id: task.id || task.task_id || "",
        hashtag: task.hashtag || "",
        title: task.task_name || "Untitled Task",
        description: task.task_description || null,
        karma: task.karma || 0,
        channel: task.submission_channel?.name || null,
        discord_id: task.submission_channel?.discord_id || null,
        type: task.type || "regular",
        variable_karma: task.variable_karma || false,
        level: levelName,
        ig: task.interest_group?.name || null,
        event: task.event || null,
        event_id: task.event_id || null,
        completed: task.completed || false,
      }));

      return {
        name: levelName,
        tasks,
      };
    });
  }, [data]);

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

  if (error || !data?.response) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-destructive">Failed to load journey</p>
          <p className="text-sm text-muted-foreground">
            {error?.message || "User journey not found"}
          </p>
          <Button asChild>
            <Link href="/dashboard/mujourney">Back to MuJourney</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { full_name } = data.response;

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
      <JourneyHeader
        title={`${full_name}'s Journey`}
        subtitle={`MUID: ${muid}`}
      />

      {/* Levels */}
      <div className="space-y-8">
        {mappedLevels.map((level, index) => (
          <LevelCard
            key={level.name || `level-${index}`}
            name={level.name}
            tasks={level.tasks}
            isLocked={false}
          />
        ))}
      </div>
    </div>
  );
}
