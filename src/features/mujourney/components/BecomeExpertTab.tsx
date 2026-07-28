"use client";

/**
 * BecomeExpert Tab Component
 *
 * 📍 src/features/mujourney/components/BecomeExpertTab.tsx
 *
 * Displays IG + company tasks from the become_expert section of the task list API.
 * - IG pills: clicking one sets selectedIG → parent fetches ?ig_id=<uuid>
 * - Client-side filter: ensures only tasks belonging to the clicked IG's name are displayed.
 * - Edit button: opens EditInterestGroupsModal so user can change their IGs
 * - After edit save: parent invalidates both IG cache and task list cache
 */

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { updateInterestGroups } from "@/features/profile/api/profile.api";
import { EditInterestGroupsModal } from "@/features/profile/components/edit-interest-groups-modal";
import { mujourneyKeys } from "../hooks/query-keys";
import type {
  InterestGroup,
  TaskListPublic,
} from "../schemas/mujourney.schemas";
import { LevelCard } from "./LevelCard";

// ─── Props ────────────────────────────────────────────────────────────────────

interface BecomeExpertTabProps {
  filter?: string;
  /** become_expert tasks from the unified task list API */
  tasks?: TaskListPublic[];
  isLoading?: boolean;
  /** background refetch in progress (IG switch) */
  isFetching?: boolean;
  error?: Error | null;
  isAuthenticated?: boolean;
  /** Currently selected IG UUID (null = show all) */
  selectedIG?: string | null;
  /** User's joined interest groups — for pill labels */
  interestGroups?: InterestGroup[];
  igLoading?: boolean;
  /** Called when user clicks an IG pill */
  onIGToggle?: (igId: string) => void;
  /** Called after user successfully saves IG edits in the modal */
  onIGsUpdated?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BecomeExpertTab({
  filter = "all",
  tasks = [],
  isLoading,
  isFetching,
  error,
  isAuthenticated,
  selectedIG,
  interestGroups = [],
  igLoading,
  onIGToggle,
  onIGsUpdated,
}: BecomeExpertTabProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // ── Handle IG modal save ─────────────────────────────────────────────────
  const handleSaveIGs = async (groupIds: string[]) => {
    await updateInterestGroups(groupIds);

    // Optimistic update: reflect the newly saved IGs immediately in the cache
    const savedAois = groupIds.map((id) => {
      const existing = interestGroups.find((ig) => ig.id === id);
      return existing ?? { id, name: id };
    });
    queryClient.setQueryData(mujourneyKeys.interestGroups(), {
      hasError: false,
      statusCode: 200,
      message: null,
      response: { aois: savedAois },
    });

    // Delegate full invalidation + task list refetch to parent
    onIGsUpdated?.();
  };

  // ── Group tasks by level for LevelCard display ────────────────────────────
  const groupedLevels = useMemo(() => {
    // Find active IG display name to filter tasks client-side
    const activeIG = selectedIG
      ? interestGroups.find((g) => g.id === selectedIG)
      : null;

    // Apply completed/incomplete filter and Interest Group filter
    const filtered = tasks.filter((task) => {
      // 1. Completion filter
      if (filter === "completed" && !task.completed) return false;
      if (filter === "incomplete" && task.completed) return false;

      // 2. IG pill filter: if selectedIG is active, ONLY show tasks matching this IG's name
      if (selectedIG && activeIG) {
        if (task.ig !== activeIG.name) {
          return false;
        }
      }

      return true;
    });

    // Group by level name string (e.g. "Explorer", "Intermediate")
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
  }, [tasks, filter, selectedIG, interestGroups]);

  // Adapt IGs for the modal
  const currentGroupsForModal = interestGroups.map((ig) => ({
    id: ig.id,
    name: ig.name,
    level: { unit: "level", count: 1 },
  }));

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold">
              Advanced Interest Group Tasks
            </h2>
            <p className="text-muted-foreground mt-1">
              Complete specialized tasks in your interest groups
            </p>
          </div>

          {/* Edit IGs button */}
          {isAuthenticated && !igLoading && (
            <button
              type="button"
              onClick={() => setEditModalOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20 shrink-0"
              title="Edit interest groups"
              aria-label="Edit interest groups"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Background-refetch spinner */}
        {isFetching && !isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0 mt-1" />
        )}
      </div>

      {/* ── IG Pills ───────────────────────────────────────────────────── */}
      {!igLoading && interestGroups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {interestGroups.map((ig: InterestGroup) => {
            const isActive = selectedIG === ig.id;
            return (
              <button
                key={ig.id}
                type="button"
                onClick={() => onIGToggle?.(ig.id)}
                aria-pressed={isActive}
                className={`rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                    : "border-primary/40 bg-primary/5 text-foreground hover:border-primary hover:bg-primary/10"
                }`}
              >
                {ig.name}
              </button>
            );
          })}

          {/* "All IGs" clear pill */}
          {selectedIG && (
            <button
              type="button"
              onClick={() => onIGToggle?.(selectedIG)}
              className="rounded-full border-2 border-muted-foreground/30 bg-muted/40 px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* ── Unauthenticated prompt ─────────────────────────────────────── */}
      {!isAuthenticated && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Please log in to view interest group tasks
          </p>
        </div>
      )}

      {/* ── Loading State ─────────────────────────────────────────────── */}
      {isAuthenticated && isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        </div>
      )}

      {/* ── Error State ───────────────────────────────────────────────── */}
      {isAuthenticated && !isLoading && error && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <p className="text-destructive">Failed to load tasks</p>
            {process.env.NODE_ENV === "development" && (
              <p className="text-sm text-muted-foreground">{error.message}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Task Levels Display ───────────────────────────────────────── */}
      {isAuthenticated &&
        !isLoading &&
        !error &&
        (groupedLevels.length > 0 ? (
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
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {interestGroups.length === 0
                ? "You haven't joined any interest groups yet. Click the pencil icon to add some."
                : selectedIG
                  ? "No expert tasks available for this interest group"
                  : filter !== "all"
                    ? "No tasks match this filter"
                    : "No expert tasks available"}
            </p>
          </div>
        ))}

      {/* ── Edit Interest Groups Modal ─────────────────────────────────── */}
      <EditInterestGroupsModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        currentGroups={currentGroupsForModal}
        onSave={handleSaveIGs}
      />
    </div>
  );
}
