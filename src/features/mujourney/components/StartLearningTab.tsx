"use client";

/**
 * Start Learning Tab Component
 *
 * 📍 src/features/mujourney/components/StartLearningTab.tsx
 *
 * Displays foundational tasks from the start_journey section of the task list API.
 * Tasks are already API-filtered (no IG tasks, no event tasks, no intern tasks).
 * Client groups them by level.name for LevelCard display.
 */

import { useMemo } from "react";
import { StateDisplay } from "@/components/ui/state-display";
import type { TaskListPublic } from "../schemas";
import { LevelCard } from "./LevelCard";

interface StartLearningTabProps {
  filter?: string;
  /** start_journey tasks from the unified task list API */
  tasks?: TaskListPublic[];
  isLoading?: boolean;
  isFetching?: boolean;
  error?: Error | null;
}

export function StartLearningTab({
  filter = "all",
  tasks = [],
  isLoading,
  error,
}: StartLearningTabProps) {
  // Group tasks by level.name (e.g. "Explorer", "Intermediate") preserving API order.
  // API already orders by level.level_order then title.
  const groupedLevels = useMemo(() => {
    const filtered = tasks.filter((task) => {
      if (filter === "completed") return task.completed;
      if (filter === "incomplete") return !task.completed;
      return true;
    });

    const map = new Map<string, TaskListPublic[]>();
    filtered.forEach((task) => {
      const key = task.level ?? "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });

    return Array.from(map.entries()).map(([name, levelTasks]) => ({
      name,
      tasks: levelTasks,
    }));
  }, [tasks, filter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading your journey...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <p className="text-destructive">Failed to load tasks</p>
          {process.env.NODE_ENV === "development" && (
            <p className="text-sm text-muted-foreground">{error.message}</p>
          )}
        </div>
      </div>
    );
  }

  if (groupedLevels.length === 0) {
    return filter !== "all" ? (
      <StateDisplay variant="no-results" />
    ) : (
      <StateDisplay variant="no-tasks" />
    );
  }

  return (
    <div className="space-y-10">
      {groupedLevels.map((level) => (
        <LevelCard
          key={level.name}
          name={level.name}
          tasks={level.tasks}
          isLocked={false}
        />
      ))}
    </div>
  );
}
