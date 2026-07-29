"use client";

/**
 * BecomeExpert Tab Component
 *
 * 📍 src/features/mujourney/components/BecomeExpertTab.tsx
 *
 * Displays IG + company tasks from the become_expert section of the task list API.
 * - IG pills: clicking one sets selectedIG → parent fetches ?ig_id=<uuid>
 * - Client-side search filtering on tasks
 * - Edit button: opens EditInterestGroupsModal so user can change their IGs
 * - After edit save: parent invalidates both IG cache and task list cache
 */

import { Loader2, Pencil, Search, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { StateDisplay } from "@/components/ui/state-display";
import { updateInterestGroups } from "@/features/profile/api/profile.api";
import { EditInterestGroupsModal } from "@/features/profile/components/edit-interest-groups-modal";
import { mujourneyKeys } from "../hooks/query-keys";
import { useDebounce } from "@/hooks/use-debounce";
import type {
  InterestGroup,
  TaskListPublic,
} from "../schemas/mujourney.schemas";
import { LevelCard } from "./LevelCard";

// ─── Props ────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────

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
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);
  const queryClient = useQueryClient();

  // ── Handle IG modal save ─────────────────────────────────────────
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

  // ── Apply completion filter + search filtering ──────────────────
  const filteredTasks = useMemo(() => {
    const byCompletion = tasks.filter((task) => {
      if (filter === "completed" && !task.completed) return false;
      if (filter === "incomplete" && task.completed) return false;
      return true;
    });

    if (!debouncedSearch) return byCompletion;
    const q = debouncedSearch.toLowerCase();
    return byCompletion.filter(
      (task) =>
        task.title.toLowerCase().includes(q) ||
        task.hashtag?.toLowerCase().includes(q) ||
        task.type?.toLowerCase().includes(q) ||
        task.ig?.toLowerCase().includes(q) ||
        task.channel?.toLowerCase().includes(q) ||
        task.level?.toLowerCase().includes(q) ||
        task.event?.toLowerCase().includes(q),
    );
  }, [tasks, filter, debouncedSearch]);

  // ── Group tasks by level for LevelCard display ────────────────────
  const groupedLevels = useMemo(() => {
    const map = new Map<string, TaskListPublic[]>();
    filteredTasks.forEach((task) => {
      const key = task.level ?? "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });

    return Array.from(map.entries()).map(([name, levelTasks]) => ({
      name,
      tasks: levelTasks,
    }));
  }, [filteredTasks]);

  const clearSearch = () => setSearchInput("");

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

      {/* ── IG Pills ───────────────────────────────────────────────── */}
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

      {/* ── Loading State ───────────────────────────────────────────── */}
      {isAuthenticated && isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        </div>
      )}

      {/* ── Error State ───────────────────────────────────────────── */}
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

      {/* ── Search ─────────────────────────────────────────────────── */}
      {isAuthenticated && !isLoading && !error && (
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            id="become-expert-search"
            placeholder="Search by title, hashtag, type, IG, channel, level, event..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm"
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ── Task Levels Display ───────────────────────────────────── */}
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
          <StateDisplay
            variant="no-tasks"
            description={
              searchInput
                ? `No expert tasks match "${searchInput}". Try a different search.`
                : interestGroups.length === 0
                  ? "You haven't joined any interest groups yet. Click the pencil icon to add some."
                  : selectedIG
                    ? "No expert tasks available for this interest group"
                    : filter !== "all"
                      ? "No tasks match this filter"
                      : "No expert tasks available"
            }
          />
        ))}

      {/* ── Edit Interest Groups Modal ─────────────────────────────── */}
      <EditInterestGroupsModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        currentGroups={currentGroupsForModal}
        onSave={handleSaveIGs}
      />
    </div>
  );
}
