# MuJourney Task List API — Implementation Plan

## Overview

This document describes the implementation plan for integrating the redesigned **Task Public List API** (`GET /api/v1/dashboard/task/list/`) into the MuJourney feature. The redesign replaces the old multi-endpoint approach (separate endpoints for public levels, IG tasks, and events) with a single grouped endpoint that returns tasks in three journey sections.

The plan covers two pages:

1. **`src/app/(dashboard)/dashboard/mujourney/page.tsx`** — Main MuJourney dashboard
2. **`src/app/(dashboard)/dashboard/mujourney/[muid]/page.tsx`** — Public user journey page

---

## 1. Redesigned API Summary

### Endpoint

```
GET /api/v1/dashboard/task/list/
```

**View:** `TaskPublicListAPI` — `api/dashboard/task/dash_task_view.py:34`

### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `ig_id` | string (UUID) | No | Overrides which Interest Group's tasks appear in `become_expert`. Defaults to every IG the caller actively belongs to (`UserIgLink.is_active=True`). Only takes effect for authenticated callers — `become_expert` is always empty when unauthenticated, regardless of this param. |

There is no pagination, `search`, `sortBy`, or `task_source` param — each section returns its full task list (small, fixed-size lists).

### Response Shape

```json
{
  "hasError": false,
  "statusCode": 200,
  "message": {},
  "response": {
    "start_journey": [ /* task objects */ ],
    "become_expert": [ /* task objects */ ],
    "events": [ /* task objects */ ]
  }
}
```

### Authentication Behavior

| Caller | `start_journey` | `become_expert` | `events` |
|---|---|---|---|
| Unauthenticated | Global tasks (visibility rules apply) | `[]` (always empty) | `[]` (always empty) |
| Authenticated | Scoped to verified campus org(s) + global tasks | IG tasks + company tasks | Event-linked tasks (PUBLISHED/ONGOING, within scope) |

### Section Details

#### `start_journey`

Generic, level-ordered tasks (ordered by `level.level_order`, then `title`). Excludes:
- IG-specific tasks (`ig` is not null)
- Event-linked tasks (`event_fk` is not null)
- "Intern" tasks — hashtag starting with `#intern-`, OR the task's `requested_by` user holds an active `Intern`/`Intern Lead` role (`UserRoleLink`)

Standard org visibility rules still apply (campus-scoped tasks only visible to verified members of that campus).

#### `become_expert`

**Authenticated only** — always `[]` for unauthenticated callers.

The caller's IG task(s) **plus** company-submitted tasks, ordered by `level.level_order` then `title`.

- **IG tasks**: by default, tasks whose `ig` is one the caller actively belongs to (`UserIgLink.is_active=True`). Pass `?ig_id=<uuid>` to view a specific IG's tasks instead (overrides the default — not additive, and not restricted to IGs the caller belongs to).
- **Company tasks**: tasks whose `requested_by` user has a linked `Company` profile (`requested_by__company_profile__isnull=False`).
- Event-linked tasks are excluded here even if they'd otherwise match (they belong in `events`).

#### `events`

**Authenticated only** — always `[]` for unauthenticated callers.

Event-linked tasks (`event_fk` is not null) where the linked `Event` is `PUBLISHED` or `ONGOING` and within the caller's visibility scope — same scope logic as `EventTaskPublicListAPI` (`_build_scope_filter`, `_get_viewer_id` in `api/dashboard/events/public_views.py`). Ordered by `event_fk__title`, then `title`.

---

## 2. Task Object Fields (`TaskListPublicSerializer`)

Same shape in all three sections. Serializer: `api/dashboard/task/dash_task_serializer.py:10`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Task UUID |
| `hashtag` | string \| null | |
| `title` | string | |
| `description` | string \| null | |
| `karma` | int | |
| `channel` | string \| null | `channel.name` |
| `discord_id` | string \| null | `channel.discord_id` |
| `type` | string | `type.title` (display title, e.g. "regular") |
| `variable_karma` | bool | |
| `level` | string \| null | `level.name` (display name, e.g. "Explorer") |
| `ig` | string \| null | `ig.name` (display name, e.g. "AI & ML") |
| `event` | string \| null | Free-text event field on the task |
| `event_id` | string \| null | `event_fk_id`, present when the task is linked to an `Event` row |

Example (`become_expert` entry):

```json
{
  "id": "6c0b3c9e-...-a1f2",
  "hashtag": "#ig-ai-ml-project",
  "title": "Build an ML model",
  "description": "...",
  "karma": 40,
  "channel": "ai-ml",
  "discord_id": "123456789012345678",
  "type": "regular",
  "variable_karma": false,
  "level": "Explorer",
  "ig": "AI & ML",
  "event": null,
  "event_id": null
}
```

---

## 3. Key Differences from Old API

| Aspect | Old API | Redesigned API |
|---|---|---|
| Endpoints | 3+ separate endpoints (`/public/list/levels/`, `/register/area-of-interest/list/`, etc.) | Single endpoint `/api/v1/dashboard/task/list/` |
| Response structure | Flat array of levels with nested tasks | Grouped object with `start_journey`, `become_expert`, `events` |
| Pagination | Yes (paginated) | No (small fixed-size lists) |
| Search/sort | Supported | Not supported |
| Auth | Required for some endpoints | Optional (`CustomizePermission`) |
| Unauthenticated view | Public levels only | `start_journey` only; `become_expert` and `events` are `[]` |
| IG filtering | Separate endpoint with `ig_id` param | `?ig_id=<uuid>` query param on single endpoint |
| Task shape | `task_name`, `task_description`, `discord_link`, etc. | `id`, `title`, `description`, `karma`, `channel`, `discord_id`, `type`, `variable_karma`, `level`, `ig`, `event`, `event_id` |
| Ordering | Varies by endpoint | Each section ordered by `level.level_order` then `title` (or `event_fk__title` for events) |
| Intern tasks | Not explicitly filtered | Excluded from `start_journey` by API |

---

## 4. Files to Create or Modify

### 4.1 New Schema — `src/features/mujourney/schemas/mujourney.schemas.ts`

**Add** a new schema for the redesigned API response and the new task shape:

```ts
// ─── Redesigned Task Schema ───────────────────────────────────

export const TaskListPublicSchema = z
  .object({
    id: z.string(),
    hashtag: z.string().nullable().optional(),
    title: z.string(),
    description: z.string().nullable().optional(),
    karma: z.number(),
    channel: z.string().nullable().optional(),
    discord_id: z.string().nullable().optional(),
    type: z.string(),
    variable_karma: z.boolean(),
    level: z.string().nullable().optional(),
    ig: z.string().nullable().optional(),
    event: z.string().nullable().optional(),
    event_id: z.string().nullable().optional(),
  })
  .passthrough();

export type TaskListPublic = z.infer<typeof TaskListPublicSchema>;

// ─── Redesigned Task List Response ────────────────────────────

export const TaskListResponseSchema = z
  .object({
    hasError: z.boolean().default(false),
    statusCode: z.number().default(200),
    message: DjangoMessageSchema,
    response: z
      .object({
        start_journey: z.array(TaskListPublicSchema).default([]),
        become_expert: z.array(TaskListPublicSchema).default([]),
        events: z.array(TaskListPublicSchema).default([]),
      })
      .passthrough(),
  })
  .passthrough();

export type TaskListResponse = z.infer<typeof TaskListResponseSchema>;
```

### 4.2 New API Function — `src/features/mujourney/api/mujourney.api.ts`

**Add** a new `fetchTaskList` function and **deprecate** the old `fetchPublicLevels` and `fetchIGTasks`:

```ts
/**
 * Fetch grouped task list using the redesigned API.
 * Replaces fetchPublicLevels() and fetchIGTasks().
 * @param igId - Optional Interest Group ID to filter become_expert to a specific IG
 */
export async function fetchTaskList(igId?: string) {
  const query = new URLSearchParams();
  if (igId) {
    query.set("ig_id", igId);
  }
  const qs = query.toString();
  return await apiClient.get(
    `${endpoints.mujourney.taskList}${qs ? `?${qs}` : ""}`,
    TaskListResponseSchema,
  );
}
```

**Update** the endpoint in `src/api/endpoints.ts`:

```ts
mujourney: {
  // ... existing endpoints ...
  /** GET - Redesigned grouped task list (replaces publicListLevels + IG tasks) */
  taskList: "/api/v1/dashboard/task/list/",
},
```

### 4.3 Updated Hook — `src/features/mujourney/hooks/useStartLearning.ts`

**Replace** the old `useStartLearning` hook that called `fetchPublicLevels()` / `fetchUserLevels()` with a new hook that calls `fetchTaskList()`:

```ts
/**
 * Hook for fetching grouped task list (redesigned API).
 * Replaces the old useStartLearning that called separate endpoints.
 * @param igId - Optional IG ID to filter become_expert to a specific IG
 */
export function useTaskList(igId?: string) {
  const isAuthenticated = authStore.isAuthenticated();

  return useQuery({
    queryKey: mujourneyKeys.taskList(igId),
    queryFn: () => fetchTaskList(igId),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated || !igId,
  });
}
```

### 4.4 Updated Query Keys — `src/features/mujourney/hooks/query-keys.ts`

**Add** the new query key:

```ts
export const mujourneyKeys = {
  all: ["mujourney"] as const,

  // Task list (redesigned API)
  taskList: (igId?: string) =>
    [...mujourneyKeys.all, "task-list", igId ?? "public"] as const,

  // Legacy keys (keep for backward compat during migration)
  userLevels: () => [...mujourneyKeys.all, "user-levels"] as const,
  publicLevels: () => [...mujourneyKeys.all, "public-levels"] as const,
  igTasks: (igId: string) => [...mujourneyKeys.all, "ig-tasks", igId] as const,
  publicUserJourney: (muid: string) =>
    [...mujourneyKeys.all, "public-journey", muid] as const,
  interestGroups: () => [...mujourneyKeys.all, "interest-groups"] as const,
  userLevelFeed: () => [...mujourneyKeys.all, "user-level-feed"] as const,
} as const;
```

### 4.5 Updated `MuJourneyDashboard` — `src/features/mujourney/components/MuJourneyDashboard.tsx`

**Refactor** to use the new grouped data shape from the redesigned API:

```tsx
interface MuJourneyDashboardProps {
  taskList: TaskListResponse | null;
  isAuthenticated: boolean;
}

export function MuJourneyDashboard({
  taskList,
  isAuthenticated,
}: MuJourneyDashboardProps) {
  const [activeTab, setActiveTab] = useState("start-learning");
  const [filter, setFilter] = useState("all");
  const [selectedIG, setSelectedIG] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Extract grouped sections from the redesigned API response
  const startJourney = taskList?.response?.start_journey ?? [];
  const becomeExpert = taskList?.response?.become_expert ?? [];
  const events = taskList?.response?.events ?? [];

  // ─── IG Pill Handler ──────────────────────────────────────
  // When an IG pill is clicked, fully invalidate the task list query
  // so that fetchTaskList(igId) is called with the specific IG ID.
  // This shows only that IG's tasks in the become_expert section.
  const handleToggleIG = (igId: string) => {
    const newIG = selectedIG === igId ? null : igId;
    setSelectedIG(newIG);

    // Full invalidation: stale the query so useTaskList refetches
    // with the new igId, replacing the entire become_expert section
    // with only that IG's tasks.
    queryClient.invalidateQueries({
      queryKey: mujourneyKeys.taskList(newIG ?? undefined),
    });
  };

  // ... rest of the component uses these grouped arrays directly
  // instead of fetching from separate endpoints
}
```

**Key changes:**
- Remove `useStartLearning` and `useInterestGroups` hooks (replaced by single `useTaskList`)
- Remove `initialLevels` prop — replaced by `taskList`
- **IG pills retained** — when an IG pill is toggled, `queryClient.invalidateQueries` triggers a full invalidation of the task list query, causing `fetchTaskList(igId)` to refetch with the specific `ig_id`
- The `filter` dropdown (All/Completed/Incomplete) still applies client-side filtering on the task arrays
- The `Others` tab (`LearnerTasksPage`) is removed since the redesigned API doesn't support `task_source` filtering — or kept as a separate feature if needed independently

### 4.6 Updated `StartLearningTab` — `src/features/mujourney/components/StartLearningTab.tsx`

**Refactor** to accept the new `TaskListPublic[]` array instead of `GetUserLevelsResponse`:

```tsx
interface StartLearningTabProps {
  filter?: string;
  tasks?: TaskListPublic[];  // start_journey section
  isLoading?: boolean;
  error?: Error | null;
}

export function StartLearningTab({
  filter = "all",
  tasks = [],
  isLoading,
  error,
}: StartLearningTabProps) {
  // Group tasks by level for display in LevelCard
  // Apply filter (completed/incomplete/all) client-side
  // Exclude intern tasks (hashtag starting with #intern-)
  // Exclude IG-specific tasks (ig is not null) and event-linked tasks (event_id is not null)
  // — these are already excluded by the API, but client-side filtering adds safety
}
```

**Key changes:**
- Replace `levels` (array of `UserLevelData`) with flat `tasks` array (from `start_journey`)
- Group tasks by `level` field (which is `level.name`, e.g. "Explorer") for `LevelCard` display
- Apply `filter` (completed/incomplete/all) client-side
- Exclude intern tasks (hashtag `#intern-` prefix) — already filtered by API, client-side adds safety
- Exclude IG-specific tasks (`ig` is not null) and event-linked tasks (`event_id` is not null) — already filtered by API

### 4.7 Updated `BecomeExpertTab` — `src/features/mujourney/components/BecomeExpertTab.tsx`

**Refactor** to use `become_expert` tasks from the redesigned API **with IG pills retained**:

```tsx
interface BecomeExpertTabProps {
  filter?: string;
  tasks?: TaskListPublic[];  // become_expert section
  isLoading?: boolean;
  error?: Error | null;
  isAuthenticated?: boolean;
  selectedIG?: string | null;
  onIGToggle?: (igId: string) => void;
  interestGroups?: InterestGroup[];
}

export function BecomeExpertTab({
  filter = "all",
  tasks = [],
  isLoading,
  error,
  isAuthenticated,
  selectedIG,
  onIGToggle,
  interestGroups = [],
}: BecomeExpertTabProps) {
  // IG pills are rendered and when toggled, onIGToggle is called
  // The parent (MuJourneyDashboard) handles full invalidation + refetch
  // Tasks are already filtered by the API for the selected IG

  // Apply completed/incomplete filter client-side
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === "completed") return task.completed;
      if (filter === "incomplete") return !task.completed;
      return true;
    });
  }, [tasks, filter]);

  // Group by level for LevelCard display
  // level field is level.name (e.g. "Explorer"), ordered by level.level_order from API
  const groupedLevels = useMemo(() => {
    const map = new Map<string, TaskListPublic[]>();
    filteredTasks.forEach((task) => {
      const levelKey = task.level ?? "Unknown";
      if (!map.has(levelKey)) map.set(levelKey, []);
      map.get(levelKey)?.push(task);
    });
    return Array.from(map.entries()).map(([name, levelTasks]) => ({
      name,
      karma: 0,
      tasks: levelTasks,
    }));
  }, [filteredTasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Advanced Interest Group Tasks</h2>
          <p className="text-muted-foreground mt-1">
            Complete specialized tasks in your interest groups
          </p>
        </div>
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => {/* open edit modal */}}
            className="..."
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* IG Pills — retained, trigger full task list invalidation on change */}
      {!isLoading && interestGroups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {interestGroups.map((ig) => (
            <button
              key={ig.id}
              type="button"
              onClick={() => onIGToggle?.(ig.id)}
              className={`...`}
            >
              {ig.name}
            </button>
          ))}
        </div>
      )}

      {/* Levels Display */}
      {groupedLevels.length > 0 ? (
        <div className="space-y-10">
          {groupedLevels.map((level) => (
            <LevelCard key={level.name} level={level} isLocked={false} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {selectedIG
              ? "No expert tasks available for this interest group"
              : isAuthenticated
                ? "You haven't joined any interest groups yet"
                : "Please log in to view interest group tasks"}
          </p>
        </div>
      )}

      {/* Edit Modal — retained for IG management */}
      <EditInterestGroupsModal ... />
    </div>
  );
}
```

**Key changes:**
- **IG pills are retained** — when an IG pill is toggled, `onIGToggle` is called
- The parent (`MuJourneyDashboard`) calls `queryClient.invalidateQueries({ queryKey: mujourneyKeys.taskList(newIG) })` which **fully invalidates** the task list query, causing `fetchTaskList(igId)` to refetch with the specific `ig_id` param
- The API returns only that IG's tasks in `become_expert` — the client just displays what the API returns
- The old `useInterestGroups` dependency for IG data fetching is removed (the parent still fetches IGs separately if needed for the pill labels)
- Company tasks are included in `become_expert` by the API
- Apply `filter` (completed/incomplete/all) client-side
- `level` field is `level.name` (display string like "Explorer"), used for grouping into `LevelCard` sections

### 4.8 Updated `EventsTab` — `src/features/mujourney/components/EventsTab.tsx`

**Refactor** to use `events` from the redesigned API instead of `usePublicTasks`:

```tsx
interface EventsTabProps {
  filter?: string;
  tasks?: TaskListPublic[];  // events section
  isLoading?: boolean;
  error?: Error | null;
}

export function EventsTab({
  filter = "all",
  tasks = [],
  isLoading,
  error,
}: EventsTabProps) {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 400);

  // Client-side search filtering on the events tasks from the redesigned API
  const filteredTasks = useMemo(() => {
    if (!debouncedSearch) return tasks;
    const q = debouncedSearch.toLowerCase();
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(q) ||
        task.hashtag?.toLowerCase().includes(q) ||
        task.type?.toLowerCase().includes(q) ||
        task.ig?.toLowerCase().includes(q) ||
        task.channel?.toLowerCase().includes(q) ||
        task.level?.toLowerCase().includes(q),
    );
  }, [tasks, debouncedSearch]);

  // Group by level for LevelCard display
  // level field is level.name (e.g. "Explorer"), ordered by level.level_order from API
  const groupedLevels = useMemo(() => {
    const map = new Map<string, TaskListPublic[]>();
    filteredTasks.forEach((task) => {
      const levelKey = task.level ?? "Unknown";
      if (!map.has(levelKey)) map.set(levelKey, []);
      map.get(levelKey)?.push(task);
    });
    return Array.from(map.entries()).map(([name, levelTasks]) => ({
      name,
      karma: 0,
      tasks: levelTasks,
    }));
  }, [filteredTasks]);

  // ... render with LevelCard, search input, no pagination
}
```

**Key changes:**
- Remove `usePublicTasks` hook dependency
- Remove pagination (the redesigned API returns full lists, not paginated)
- Keep search functionality as client-side filtering
- Group tasks by `level` field (`level.name`) for `LevelCard` display
- Events are already ordered by `event_fk__title`, then `title` from the API

### 4.9 Updated Main Page — `src/app/(dashboard)/dashboard/mujourney/page.tsx`

**Refactor** to use the redesigned API:

```tsx
import { fetchTaskList } from "@/features/mujourney/api";
import { isAuthenticated } from "@/lib/auth/server";

export default async function MuJourneyPage() {
  const authenticated = await isAuthenticated();

  let initialTaskList = null;

  // Fetch grouped task list — API handles auth internally
  // Unauthenticated callers get start_journey only
  // Authenticated callers get all three sections
  try {
    const taskData = await fetchTaskList();
    if (taskData) {
      initialTaskList = taskData;
    }
  } catch {
    // Non-fatal: the client component can still fetch
  }

  return (
    <MuJourneyDashboard
      taskList={initialTaskList}
      isAuthenticated={authenticated}
    />
  );
}
```

**Key changes:**
- Replace `fetchPublicLevels()` with `fetchTaskList()`
- Replace `initialLevels` prop with `taskList` prop
- Remove the conditional SSR logic that skipped fetching for authenticated users (the API handles this internally — unauthenticated callers only get `start_journey`, authenticated get all sections)
- The `try/catch` remains for non-fatal error handling

### 4.10 Updated Public User Journey Page — `src/app/(dashboard)/dashboard/mujourney/[muid]/page.tsx`

**Update** to use the redesigned API for the public user journey view:

```tsx
import type { Metadata } from "next";
import { PublicUserJourneyPageClient } from "./mujourney-client";

export const metadata: Metadata = {
  title: "MuJourney",
  description: "Track your learning journey.",
};

interface PageProps {
  params: Promise<{ muid: string }>;
}

export default async function MuJourneyPage({ params }: PageProps) {
  const { muid } = await params;
  return <PublicUserJourneyPageClient muid={muid} />;
}
```

**Update** the client component — `src/app/(dashboard)/dashboard/mujourney/[muid]/mujourney-client.tsx`:

The redesigned API can be used here in two ways:

**Option A (Recommended):** Use the redesigned API to show available tasks alongside the user's journey progress. The `start_journey` section shows what tasks are available, and the user's completed tasks are shown from the existing `PublicUserJourneyResponse`.

**Option B:** Replace the old `fetchPublicUserJourney` with the redesigned API if the goal is to show a public user's task completion status.

For this plan, we'll go with **Option A** — keep the existing journey data and add the task list:

```tsx
interface PublicUserJourneyPageClientProps {
  muid: string;
}

export function PublicUserJourneyPageClient({ muid }: PublicUserJourneyPageClientProps) {
  const { data: journeyData, isLoading: journeyLoading } = useUserJourney(muid);
  const { data: taskListData, isLoading: taskListLoading } = useTaskList();

  // Combine journey progress with available tasks
  // Show user's completed tasks vs available start_journey tasks
  // If authenticated, also show become_expert and events sections
}
```

**Key changes:**
- Add `useTaskList()` hook to fetch the redesigned API's grouped task list
- Combine `journeyData` (user's progress) with `taskListData` (available tasks)
- Show which `start_journey` tasks the user has completed vs still available
- The `become_expert` and `events` sections are available if the viewer is authenticated

---

## 5. IG Pill Revalidation Flow

When the user clicks an IG pill in `BecomeExpertTab`, the following sequence occurs:

```
1. User clicks an IG pill
2. BecomeExpertTab calls onIGToggle(igId)
3. MuJourneyDashboard updates selectedIG state
4. MuJourneyDashboard calls queryClient.invalidateQueries({
       queryKey: mujourneyKeys.taskList(newIG ?? undefined)
     })
5. React Query marks the task list query as stale (full invalidation)
6. useTaskList(igId) triggers a full refetch
7. fetchTaskList(igId) calls GET /api/v1/dashboard/task/list/?ig_id=<igId>
8. API returns become_expert tasks filtered to ONLY that specific IG
9. MuJourneyDashboard re-renders with the new become_expert data
10. BecomeExpertTab receives the updated tasks prop and re-renders
    showing only the selected IG's tasks
```

This ensures that:
- The API is **fully invalidated and revalidated** with the correct `ig_id` parameter
- The `become_expert` section shows **only** the selected IG's tasks
- The stale-while-revalidate pattern of React Query provides a smooth UX with a loading state during refetch
- Clicking the same IG pill again (to deselect) sets `igId` to `undefined`, which fetches all IGs' tasks

---

## 6. Implementation Order

### Phase 1: Foundation (Schemas & API Layer)
1. Add `TaskListPublicSchema` and `TaskListResponseSchema` to `mujourney.schemas.ts`
2. Add `taskList` endpoint to `endpoints.ts`
3. Add `fetchTaskList()` to `mujourney.api.ts`
4. Add `taskList` query key to `query-keys.ts`

### Phase 2: Hooks
5. Add `useTaskList()` hook to replace `useStartLearning()`
6. Update `useStartLearning.ts` to mark as deprecated or remove

### Phase 3: Components
7. Update `MuJourneyDashboard.tsx` to accept `taskList` prop, extract grouped sections, and handle IG pill revalidation via `queryClient.invalidateQueries`
8. Update `StartLearningTab.tsx` to accept `TaskListPublic[]` and group by level
9. Update `BecomeExpertTab.tsx` to accept `TaskListPublic[]`, retain IG pills, and delegate revalidation to parent
10. Update `EventsTab.tsx` to accept `TaskListPublic[]` and remove `usePublicTasks` dependency

### Phase 4: Pages
11. Update `page.tsx` (main MuJourney) to use `fetchTaskList()` and pass `taskList` prop
12. Update `[muid]/mujourney-client.tsx` to integrate `useTaskList()` alongside existing journey data

### Phase 5: Cleanup
13. Remove deprecated `fetchPublicLevels`, `fetchIGTasks` from `mujourney.api.ts`
14. Remove deprecated `PublicListLevelsResponseSchema` from schemas (or keep for backward compat)
15. Remove `useStartLearning` hook (or keep as wrapper around `useTaskList`)
16. Remove `Others` tab if no longer needed (or keep as separate feature)
17. Update `Task_Public_List_API.md` to reflect implementation status

---

## 7. Data Flow Diagram

### Before (Old)

```
page.tsx (Server)
  ├─ fetchPublicLevels() → PublicListLevelsResponse
  └─ MuJourneyDashboard(initialLevels, isAuthenticated)
       ├─ useStartLearning(initialLevels)
       │    ├─ isAuthenticated? fetchUserLevels() : fetchPublicLevels()
       │    └─ Returns GetUserLevelsResponse (array of levels)
       ├─ useInterestGroups()
       │    └─ Returns InterestGroupsResponse
       ├─ StartLearningTab(levelsData, filter)
       │    └─ Filters #cl- tasks client-side
       ├─ BecomeExpertTab(levelsData, igData, filter, isAuthenticated)
       │    └─ Filters #cl- tasks + IG pills client-side
       └─ EventsTab()
            └─ Uses usePublicTasks(is_event_task=true) separately
```

### After (Redesigned)

```
page.tsx (Server)
  ├─ fetchTaskList() → TaskListResponse
  └─ MuJourneyDashboard(taskList, isAuthenticated)
       ├─ useTaskList()
       │    └─ fetchTaskList(igId?) → TaskListResponse
       │    └─ Returns { start_journey, become_expert, events }
       ├─ StartLearningTab(tasks=start_journey, filter)
       │    └─ Groups by level, filters completed/incomplete client-side
       ├─ BecomeExpertTab(tasks=become_expert, filter, selectedIG, onIGToggle)
       │    └─ IG pills retained; on toggle → invalidateQueries → full refetch with ig_id
       │    └─ API returns ONLY that IG's tasks in become_expert
       └─ EventsTab(tasks=events, filter)
            └─ No usePublicTasks needed (API returns events directly)
```

---

## 8. Breaking Changes & Migration Notes

### Breaking Changes
1. **`MuJourneyDashboard` props change**: `initialLevels: GetUserLevelsResponse | null` → `taskList: TaskListResponse | null`
2. **`StartLearningTab` props change**: `levelsData: GetUserLevelsResponse | null` → `tasks: TaskListPublic[]`
3. **`BecomeExpertTab` props change**: Removes `igData`, `levelsData`; adds `tasks: TaskListPublic[]`, `selectedIG`, `onIGToggle`, `interestGroups`
4. **`EventsTab` props change**: Removes `usePublicTasks` dependency; adds `tasks: TaskListPublic[]`
5. **Task shape change**: Old `TaskSchema` fields (`task_name`, `task_description`, `discord_link`) → New `TaskListPublicSchema` fields (`title`, `description`, `discord_id`)
6. **Level grouping key change**: Old: `UserLevelData.name` (level object name). New: `TaskListPublic.level` (string like "Explorer")

### Migration Strategy
- Keep old schemas and API functions during a transition period
- Add new schemas alongside old ones
- Update components to use new data shape
- Remove old code in a follow-up cleanup PR

### Backward Compatibility
- The old `fetchPublicLevels()` endpoint remains on the backend
- The old `PublicListLevelsResponseSchema` stays in schemas (not removed)
- The `useStartLearning` hook can be kept as a thin wrapper around `useTaskList` during migration

---

## 9. Testing Checklist

- [ ] Unauthenticated user sees `start_journey` tasks on the main MuJourney page
- [ ] Authenticated user sees all three sections (`start_journey`, `become_expert`, `events`)
- [ ] `become_expert` section shows IG tasks for authenticated users
- [ ] `become_expert` section shows company tasks for authenticated users
- [ ] `events` section shows event-linked tasks for authenticated users
- [ ] `become_expert` and `events` are empty arrays for unauthenticated users
- [ ] `?ig_id=<uuid>` query param correctly filters `become_expert` to a specific IG
- [ ] **Clicking an IG pill fully invalidates the task list query and refetches with `ig_id`**
- [ ] **After IG pill click, `become_expert` shows ONLY that IG's tasks**
- [ ] Clicking the same IG pill again (deselect) refetches all IGs' tasks
- [ ] Intern tasks (hashtag `#intern-`) are excluded from `start_journey`
- [ ] IG-specific tasks are excluded from `start_journey`
- [ ] Event-linked tasks are excluded from `start_journey`
- [ ] Filter dropdown (All/Completed/Incomplete) works correctly on all tabs
- [ ] Public user journey page (`/[muid]`) shows task list alongside journey progress
- [ ] Search in Events tab works as client-side filtering
- [ ] Loading and error states display correctly for all tabs
- [ ] No regression in existing `Others` tab (if kept)

---

## 10. Risks & Considerations

| Risk | Mitigation |
|---|---|
| Redesigned API returns fewer fields than old API | Map new fields to existing component expectations; update `LevelCard` to use new field names |
| `become_expert` section may be empty for some users | Show appropriate empty state message ("No expert tasks available") |
| `events` section may be empty | Show appropriate empty state message ("No upcoming events") |
| Client-side grouping by level in `StartLearningTab` may produce inconsistent ordering | The API already orders by `level.level_order` then `title`; group by `level.name` preserving API order |
| IG pill revalidation causes a brief loading state | Use `placeholderData` or `previousData` in `useTaskList` to show stale data while refetching |
| Removing pagination from Events tab may impact performance if event list grows | The API returns small fixed-size lists; monitor response sizes |
| `ig` field is `ig.name` (display string), not an ID | Use `ig` field directly for IG pill labels; the `ig_id` param uses UUIDs, not display names |
| `level` field is `level.name` (display string), not a number | Group by `level.name` for `LevelCard`; ordering is handled by the API via `level.level_order` |
