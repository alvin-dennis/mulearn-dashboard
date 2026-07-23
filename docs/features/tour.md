# Feature: Onboarding Tour (`tour`)

**Status:** Planned, not started
**Owner:** TBD
**Depends on:** `driver.js` (new dependency), no backend changes
**Replaces:** `docs/onboarding-tour-plan.md` (v1/v2/v3 design history — this doc is the
authoritative spec going forward; keep the old file for design-rationale reference only)

Full spec + implementation plan in one document, as a standalone feature, following this
repo's `src/features/<name>/` convention (see `src/features/role-verification`,
`src/features/manage-ig` for the shape being matched).

---

## 1. Problem Statement

New users land on their role's dashboard with no guided introduction to the sidebar,
key workflows, or role-specific tools. There's no existing onboarding mechanism besides
`OnboardingGuard` (`src/app/(dashboard)/onboarding-guard.tsx`) which only gates
*profile-completion*, not feature discovery. Existing "what's new" popup
(`whats-new-actions.ts`) solves changelog announcements, not first-time guidance.

## 2. Goals

- Guided, spotlight-style walkthrough of each persona's dashboard on first visit.
- Zero backend involvement — ships entirely in this repo, no API contract to coordinate.
- Replayable on demand ("Take a Tour").
- Skippable, non-blocking, never re-shown automatically once seen (until the tour's
  version is bumped by a future content change).
- Correctly scoped per persona — a Student never sees Mentor-only steps, Admin never
  sees a tour at all.

## 3. Non-Goals

- No cross-device sync (cookie is per-browser; explicitly accepted trade-off, see
  `docs/onboarding-tour-plan.md` §0).
- No analytics pipeline / funnel tracking (`outcome` field is stored for potential future
  manual inspection only, nothing consumes it).
- No delta/partial tours in v1 of this feature — every version bump is a full replay.
  (Delta-tour filtering was scoped in the earlier design doc but is **cut** here to keep
  the first implementation small; revisit only if full-replay fatigue becomes a real
  complaint — see §14 Future Work.)
- No admin/associate tour.
- No contextual/inline tours (tooltips inside a specific page, e.g. "here's how to
  create a task") — this feature is sidebar/dashboard-shell orientation only.

## 4. Personas & Scope

Role source of truth: `src/lib/auth/roles.ts` (`ROLES` const — exact strings must match
backend `RoleType` enum, e.g. `"Admins"`, `"Campus Lead"`, `"Lead Enabler"`).
Home-route source of truth: `src/lib/auth/role-routing.ts` (`getRoleHomePath`).

| Tour key | Roles shown to | Home route | Home-route priority note |
|---|---|---|---|
| `dashboard` | Student, Pre Member, Fellow (default fallthrough), Mentor, Company, IG Lead, **Enabler** | `/dashboard` | `role-routing.ts:44` only sends `CAMPUS_LEAD`/`LEAD_ENABLER` to `/dashboard/campus/manage`; plain `ENABLER` role falls through to the `/dashboard` default (line 53-54) — Enabler therefore gets the `dashboard` tour, not the `campus` tour, despite sharing `campus:manage` permission |
| `intern` | Intern, Intern Lead | `/dashboard/intern` | `role-routing.ts:49-50` |
| `campus` | Campus Lead, Lead Enabler | `/dashboard/campus/manage` | `role-routing.ts:44` |
| `zonal` | Zonal Campus Lead | `/dashboard/zonal` | `role-routing.ts:35-36`; **Admin does not land here** — Admin's home path resolves to `/dashboard/management` because the Admin check (`role-routing.ts:26-27`) runs before the zonal check. Admin *can* still manually navigate to `/dashboard/zonal` (has `zonal:view` permission per `permissions.ts`) — launch check must still gate on role, not rely on home-route redirect alone |
| `district` | District Campus Lead | `/dashboard/district` | `role-routing.ts:39-40`; same Admin caveat as zonal |

**No tour:** Admin, Associate (`role-routing.ts:26-32`, both resolve to
`/dashboard/management`) — explicit product decision, see `docs/onboarding-tour-plan.md`
§2/§4 rationale (power users, highest nav churn, self-explanatory console).

**No tour, no nav item, not in scope:** Discord Moderator, Ex Official, Appraiser,
Bot Dev, Tech Team, Campus Activation Team, Suspended — permission-scoped roles with no
dedicated dashboard shell to tour.

### Why `dashboard` is one tour, not four
Student/Mentor/Company/IG Lead/Enabler all render the identical `/dashboard` route and
sidebar shell (`src/components/dashboard/app-sidebar.tsx`) — same component tree,
different `NAV_ITEMS` filtered in by `src/hooks/use-filtered-nav.ts`. One tour with
role/permission-gated steps reuses that filtering instead of maintaining four near-
duplicate tour definitions and four cookie entries for what is, DOM-wise, one page.

---

## 5. Highlight Points Per Persona

Concrete step-by-step spotlight sequence per tour key, built from real `NAV_ITEMS`
(`src/lib/nav-config.ts`) and role/flag gates in `roles.ts`/`permissions.ts`. This is the
content backing the abstract `steps/*.ts` files in §8.5 — "what to show" per persona, not
just the mechanism. Order = top-to-bottom sidebar order, Welcome first, Finish last.

### 5.1 Student, Pre Member, Fellow (`dashboard`, base steps — no role gate)
| # | navId | What to show |
|---|---|---|
| 1 | `home` | Welcome message — one-time intro, what μLearn dashboard is for |
| 2 | `home` | Home — where activity/summary lives |
| 3 | `profile` | Profile — where to complete/edit personal + academic info |
| 4 | `mujourney` | μJourney — the core task/progression flow, primary karma-earning path |
| 5 | `interest-groups` | Interest Groups — how to discover and join a community |
| 6 | `learning-circle` | Learning Circle — peer learning groups |
| 7 | `search` | Search — finding people/IGs/content across the platform |
| 8 | `projects` | Projects — showcase/build work |
| 9 | `events` | Events — upcoming sessions and hackathons |
| 10 | `weekly-twitches` | Weekly Twitches — recurring engagement feature |
| 11 | `leaderboard` | Leaderboard — karma ranking, competitive motivation |
| 12 | `muverse` | µVerse — closing highlight before Finish |
| 13 | `home` | Finish — "you're all set", point to manual replay location |

### 5.2 Mentor (`dashboard`, base steps 1-12 minus items Mentor doesn't see + these role-gated additions)
| navId | Gate | What to show |
|---|---|---|
| `talent-pool` | `requiresRole: [Mentor, Company]` | Talent Pool — where mentors browse/engage learners |
| `mentor-sessions` | `requiresRole: [Mentor]` + `requiresFlag: isMentorVerified` | Sessions — scheduling/managing mentor sessions; step must be skipped entirely (not shown greyed-out) if not yet verified |
| `mentor-task-requests` | `requiresRole: [Mentor]` + `requiresFlag: isMentorVerified` | Task Requests — reviewing/approving learner task submissions |
| `mentor-mentees` | `requiresRole: [Mentor]` | Mentees — roster of assigned mentees |
| `manage-events` | `requiresFlag: hasPermission(user, "events:manage")` | Manage Events — creating/managing events tied to their mentor role; Mentor is granted `events:manage` directly (`permissions.ts:76-85`) |

### 5.3 Company (`dashboard`, base steps 1-12 minus items Company doesn't see + these)
| navId | Gate | What to show |
|---|---|---|
| `talent-pool` | `requiresRole: [Mentor, Company]` | Talent Pool — browsing candidate learners; **skip step if `isRestrictedCompanyFeature`** (unverified company, §10 edge case) |
| `company-jobs` | `requiresRole: [Company]` | Job Management — posting/managing job listings |
| `company-tasks` | `requiresRole: [Company]` | Task Management — assigning tasks to learners; only role with this nav item (`nav-config.ts:259-265`, no other persona has a "Task Management" item) |
| `company-mentors` | `requiresRole: [Company]` | Mentor Management — managing affiliated mentors |
| `company-ig-requests` | `requiresRole: [Company]` | IG Requests — sponsorship/collaboration requests with Interest Groups |
| `company-analytics` | `requiresRole: [Company]` | Analytics & Performance — hiring funnel / engagement metrics |
| `manage-events` | `requiresFlag: hasPermission(user, "events:manage")` | Manage Events — creating/managing events as an organizing Company |

Company doesn't get `mujourney`/`learning-circle`/`leaderboard` steps — not an explicit
exclusion, those steps just aren't part of the Company-relevant subset (§8.5 note).

### 5.4 IG Lead (`dashboard`, base steps 1-12 + these, then Finish)
| navId | Gate | What to show |
|---|---|---|
| `interest-groups` (edit-IG variant) | `requiresFlag: hasIgLeadRole(user.roles)` | Manage Your Interest Group — editing IG details, reviewing member/task activity for the IG(s) they lead |
| `weekly-twitches-manage` | `requiresFlag: hasIgLeadRole(user.roles)` | Manage Weekly Twitches — lead-facing controls on top of the base `weekly-twitches` step (row 10), same pattern as the IG-edit variant above |
| `manage-events` | `requiresFlag: hasPermission(user, "events:manage")` | Manage Events — IG Leads gain `events:manage` dynamically, any role string ending in `" IGLead"` (`permissions.ts:190-191`), not via a static role in `ROLES` |
| `home` | `requiresFlag: hasIgLeadRole(user.roles)` | Finish — replaces base step 13, points to manual replay location |

### 5.5 Intern, Intern Lead (`dashboard`, base steps 1-12 + these, then Finish)
| navId | Gate | What to show |
|---|---|---|
| `intern-dashboard` | `requiresRole: [Intern, Intern Lead]` | Intern Dashboard — current placement/task status |
| `home` | `requiresRole: [Intern, Intern Lead]` | Finish — replaces base step 13, points to manual replay location |

### 5.6 Campus Lead, Lead Enabler (`dashboard`, base steps 1-12 + these, then Finish)
| navId | Gate | What to show |
|---|---|---|
| `campus-manage` | `requiresRole: [Campus Lead, Lead Enabler]` | Campus overview — student roster, campus stats |
| `campus-manage` | `requiresRole: [Campus Lead, Lead Enabler]` + `campus:manage` | Actions — changing student type/status |
| `campus-manage` | `requiresRole: [Campus Lead, Lead Enabler]` + `campus:view_dashboard` | Campus-level metrics |
| `manage-events` | `requiresFlag: hasPermission(user, "events:manage")` | Manage Events — Campus Lead and Lead Enabler both hold `events:manage` directly (`permissions.ts:76-85`); Campus Lead also matches dynamically via any `" CampusLead"`-suffixed role string (`permissions.ts:190-191`) |
| `home` | `requiresRole: [Campus Lead, Lead Enabler]` | Finish — replaces base step 13, points to manual replay location |

Note: plain `Enabler` role (no Lead) still gets only the base 1-12 steps plus the
`manage-events` step above (Enabler holds `events:manage` directly, `permissions.ts:81`) —
none of the other `campus-manage` additions, since it falls into `dashboard` tour per §4's
home-route table, despite sharing the `campus:manage` permission, but lacks the Lead role
gate.

### 5.7 Zonal Campus Lead (`dashboard`, base steps 1-12 + these, then Finish)
| navId | Gate | What to show |
|---|---|---|
| `zonal` | `requiresRole: [Zonal Campus Lead]` | Zonal dashboard — cross-campus rollup within the zone |
| `zonal` | `requiresRole: [Zonal Campus Lead]` | Comparison views — campus-to-campus metrics |
| `manage-events` | `requiresFlag: hasPermission(user, "events:manage")` | Manage Events — Zonal Campus Lead holds `events:manage` directly (`permissions.ts:76-85`) |
| `home` | `requiresRole: [Zonal Campus Lead]` | Finish — replaces base step 13, points to manual replay location |

### 5.8 District Campus Lead (`dashboard`, base steps 1-12 + these, then Finish)
| navId | Gate | What to show |
|---|---|---|
| `district` | `requiresRole: [District Campus Lead]` | District dashboard — cross-campus rollup within the district |
| `manage-events` | `requiresFlag: hasPermission(user, "events:manage")` | Manage Events — District Campus Lead holds `events:manage` directly (`permissions.ts:76-85`) |
| `home` | `requiresRole: [District Campus Lead]` | Finish — replaces base step 13, points to manual replay location |

### 5.9 Admin, Associate
No tour — §4 rationale (power users, highest nav churn, self-explanatory console).

---

## 6. UX Spec

### 5.1 Trigger conditions (all must hold)
1. User's role is not Admin/Associate.
2. `pathname === getRoleHomePath(user.roles)` for the resolved tour key — tour launches
   only on arrival at the persona's actual home route, never mid-navigation on another
   page, so it doesn't interrupt an in-progress task.
3. Cookie has no entry for this `tourKey`, or the stored `version` is less than
   `TOUR_VERSIONS[tourKey]`.
4. No modal/dialog/sheet is currently open (`document.querySelector('[role="dialog"][data-state="open"]')`
   returns null — Radix primitives used throughout this codebase set this attribute).
5. Resolved step list (after role/flag filtering) is non-empty.

### 5.2 Interaction
- Driver.js overlay, spotlight highlight on the target sidebar item, popover with title +
  description, Next / Previous / Skip / progress indicator ("Step 3 of 9").
- Smooth-scroll target into view before highlighting (Driver.js built-in).
- Esc key and clicking outside the popover behave as **Skip** (not silently dismiss with
  no state change — must still write the cookie, otherwise the tour reappears next load).
- Last step's "Next" button label changes to "Finish".

### 5.3 Manual replay
- Entry point: user menu / Settings → "Take a Tour" (`src/features/settings` or the
  existing profile dropdown — exact placement TBD in implementation, not a new page).
- Always launches the **full** current-version step list for the user's tour key,
  ignoring the stored cookie version.
- Does **not** write the cookie unless the user reaches Finish (an abandoned manual
  replay must not suppress the automatic first-visit tour, if for some reason it hadn't
  fired yet — e.g. a user who manually triggers replay from a non-home route before ever
  seeing the auto tour).

### 5.4 Copy content
Out of scope for engineering — step `title`/`description` text is product/design
content. Engineering ships the mechanism with placeholder copy; final copy is a
follow-up content pass before launch (§14 tracks this as a checklist item so it isn't
silently dropped).

---

## 7. Data Model — Cookie Only

No backend, no `localStorage`. Single first-party httpOnly cookie, mirroring the
existing `mulearn-whats-new` cookie pattern in this repo
(`src/app/(dashboard)/whats-new-actions.ts`).

```ts
// src/features/tour/types.ts
export type TourKey = "dashboard" | "intern" | "campus" | "zonal" | "district";
export type TourOutcome = "completed" | "skipped";

export interface TourState {
  version: number;
  outcome: TourOutcome;
}

export type TourCookiePayload = Partial<Record<TourKey, TourState>>;
```

- Absence of a `TourKey` in the payload = never seen. No signup-time seeding required —
  this is simpler than a backend-map design, which needed an explicit `version: 0`
  sentinel written at account creation.
- Cookie name: `mulearn-tour`. Options: `httpOnly: true, secure: true, sameSite: "lax",
  path: "/", maxAge: 1 year` — matches `whats-new-actions.ts`'s `COOKIE_OPTIONS` shape
  exactly, so behavior (SSR-readable, not JS-readable, not sent cross-site) is identical
  and already proven in production for the what's-new feature.
- **Cleared on logout** — see §9.4.

---

## 8. Technical Architecture

### 7.1 Feature folder (matches `src/features/role-verification` shape)

```
src/features/tour
├── index.ts                  // public exports: hooks, components, types
├── constants.ts               // TOUR_VERSIONS, TOUR_COOKIE_NAME, TOUR_COOKIE_OPTIONS
├── types.ts                   // TourKey, TourState, TourCookiePayload, TourStep
├── actions.ts                 // "use server" — getTourState, recordTourOutcome
├── steps
│   ├── dashboard.ts
│   ├── intern.ts
│   ├── campus.ts
│   ├── zonal.ts
│   └── district.ts
├── lib
│   ├── build-steps.ts         // role/flag filtering, shared by all tour keys
│   ├── resolve-tour-key.ts    // user -> TourKey | null
│   └── driver-adapter.ts      // thin wrapper around driver.js init/config
├── components
│   ├── tour-controller.tsx    // client component, mounted once in dashboard layout
│   └── replay-tour-button.tsx // manual "Take a Tour" trigger
└── hooks
    └── use-tour.ts            // core launch/skip/complete logic
```

### 7.2 Data flow

```
DashboardLayout (server component, src/app/(dashboard)/layout.tsx)
   │
   ├── await getServerUser()          (src/lib/auth/server.ts:61, existing)
   ├── await getTourState()           (new: src/features/tour/actions.ts)
   │
   ▼
<TourController user={user} initialState={tourState} />   (client component)
   │
   ├── resolveTourKey(user) -> TourKey | null   (role -> tour mapping, §4 table)
   ├── if null (Admin/Associate/unscoped role) -> render nothing
   ├── buildSteps(tourKey, user)                 (role/flag filtering, §8.4)
   ├── useTour(tourKey, steps, initialState)      (launch-condition check, §6.1)
   │
   ▼
driver.js overlay launched client-side, on the already-mounted sidebar DOM
   │
   ├── onSkip    -> recordTourOutcome(tourKey, "skipped")   (server action)
   └── onComplete -> recordTourOutcome(tourKey, "completed") (server action)
```

### 7.3 Server Actions (`src/features/tour/actions.ts`)

Copied pattern from `whats-new-actions.ts` (this repo's own precedent — same
`"use server"` file shape, same `cookies()` API from `next/headers`):

```ts
"use server";

import { cookies } from "next/headers";
import { TOUR_COOKIE_NAME, TOUR_COOKIE_OPTIONS, TOUR_VERSIONS } from "./constants";
import type { TourCookiePayload, TourKey, TourOutcome } from "./types";

async function readPayload(): Promise<TourCookiePayload> {
  const store = await cookies();
  const raw = store.get(TOUR_COOKIE_NAME)?.value;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as TourCookiePayload;
  } catch {
    return {}; // corrupt/tampered cookie -> treat as never-seen, never throw
  }
}

export async function getTourState(): Promise<TourCookiePayload> {
  return readPayload();
}

export async function recordTourOutcome(
  tourKey: TourKey,
  outcome: TourOutcome,
): Promise<void> {
  const store = await cookies();
  const current = await readPayload();
  const next: TourCookiePayload = {
    ...current,
    [tourKey]: { version: TOUR_VERSIONS[tourKey], outcome },
  };
  store.set(TOUR_COOKIE_NAME, JSON.stringify(next), TOUR_COOKIE_OPTIONS);
}
```

No retry/backoff: this is a same-origin Server Action write, not a network call to an
external backend — the earlier design draft's retry logic was scoped for a real
`PATCH /me/tour` API and doesn't apply here. If the action throws (should not happen in
normal operation), the tour may simply relaunch on next navigation to the home route;
not a data-loss scenario.

### 7.4 Step resolution (`src/features/tour/lib/build-steps.ts`)

```ts
export interface TourStep {
  id: string;
  /** matches NAV_ITEMS[].id from src/lib/nav-config.ts, e.g. "mujourney", "talent-pool" */
  navId: string;
  title: string;
  description: string;
  requiresRole?: string[];               // ROLES.* values
  requiresFlag?: (user: ServerUser) => boolean;
}

export function buildSteps(
  allSteps: TourStep[],
  user: ServerUser,
): TourStep[] {
  return allSteps.filter((step) => {
    if (step.requiresRole && !step.requiresRole.some((r) => user.roles.includes(r)))
      return false;
    if (step.requiresFlag && !step.requiresFlag(user)) return false;
    return true;
  });
}
```

Selector strategy: **do not** invent ad-hoc CSS ids. `NAV_ITEMS` (`src/lib/nav-config.ts`)
already has a canonical `id` per item (`"home"`, `"mujourney"`, `"talent-pool"`,
`"mentor-sessions"`, `"company-jobs"`, `"campus-manage"`, `"zonal"`, `"district"`,
`"interest-groups"` (edit-IG variant), etc. — full list at `nav-config.ts` lines 100-390).
Add a `data-tour-id={item.id}` attribute to the rendered nav link so Driver.js has a
stable, already-unique selector for free:

```tsx
// src/components/dashboard/app-sidebar.tsx:104 (existing renderNavItem function)
<Link href={item.linkHref ?? item.href} prefetch={false} data-tour-id={item.id}>
```

Each `TourStep.navId` then maps to `[data-tour-id="${navId}"]` at launch time — one line
change to an existing file, no new DOM structure, no risk of selector drift when nav
items get restyled (className changes don't break `data-tour-id`).

### 7.5 Dashboard step list (concrete, from real `NAV_ITEMS`)

```ts
// src/features/tour/steps/dashboard.ts
import { ROLES } from "@/lib/auth/roles";
import { hasIgLeadRole } from "@/lib/auth/roles";
import type { TourStep } from "../lib/build-steps";

export const dashboardSteps: TourStep[] = [
  { id: "welcome",  navId: "home", title: "Welcome to μLearn", description: "TBD" },
  { id: "home",     navId: "home", title: "Home", description: "TBD" },
  { id: "profile",  navId: "profile", title: "Your Profile", description: "TBD" },
  { id: "mujourney", navId: "mujourney", title: "μJourney", description: "TBD" },
  { id: "ig",       navId: "interest-groups", title: "Interest Groups", description: "TBD" },
  { id: "learning-circle", navId: "learning-circle", title: "Learning Circle", description: "TBD" },
  { id: "search",   navId: "search", title: "Search", description: "TBD" },
  { id: "projects", navId: "projects", title: "Projects", description: "TBD" },
  { id: "events",   navId: "events", title: "Events", description: "TBD" },
  { id: "twitches", navId: "weekly-twitches", title: "Weekly Twitches", description: "TBD" },
  { id: "leaderboard", navId: "leaderboard", title: "Leaderboard", description: "TBD" },
  { id: "muverse",  navId: "muverse", title: "µVerse", description: "TBD" },

  // role-gated: Mentor / Company (§5.2, §5.3)
  { id: "talent-pool", navId: "talent-pool", title: "Talent Pool", description: "TBD", requiresRole: [ROLES.MENTOR, ROLES.COMPANY] },
  { id: "mentor-sessions", navId: "mentor-sessions", title: "Sessions", description: "TBD", requiresRole: [ROLES.MENTOR], requiresFlag: (u) => u.isMentorVerified },
  { id: "mentor-task-requests", navId: "mentor-task-requests", title: "Task Requests", description: "TBD", requiresRole: [ROLES.MENTOR], requiresFlag: (u) => u.isMentorVerified },
  { id: "mentor-mentees", navId: "mentor-mentees", title: "Mentees", description: "TBD", requiresRole: [ROLES.MENTOR] },
  { id: "company-jobs", navId: "company-jobs", title: "Job Management", description: "TBD", requiresRole: [ROLES.COMPANY] },
  { id: "company-tasks", navId: "company-tasks", title: "Task Management", description: "TBD", requiresRole: [ROLES.COMPANY] },
  { id: "company-mentors", navId: "company-mentors", title: "Mentor Management", description: "TBD", requiresRole: [ROLES.COMPANY] },
  { id: "company-ig-requests", navId: "company-ig-requests", title: "IG Requests", description: "TBD", requiresRole: [ROLES.COMPANY] },
  { id: "company-analytics", navId: "company-analytics", title: "Analytics & Performance", description: "TBD", requiresRole: [ROLES.COMPANY] },

  // role-gated: IG Lead (§5.4)
  { id: "ig-edit", navId: "interest-groups", title: "Manage Your Interest Group", description: "TBD", requiresFlag: (u) => hasIgLeadRole(u.roles) },
  { id: "ig-twitches-manage", navId: "weekly-twitches-manage", title: "Manage Weekly Twitches", description: "TBD", requiresFlag: (u) => hasIgLeadRole(u.roles) },

  // role-gated: Intern, Intern Lead (§5.5)
  { id: "intern-dashboard", navId: "intern-dashboard", title: "Intern Dashboard", description: "TBD", requiresRole: [ROLES.INTERN, ROLES.INTERN_LEAD] },

  // role-gated: Campus Lead, Lead Enabler (§5.6)
  { id: "campus-overview", navId: "campus-manage", title: "Campus Overview", description: "TBD", requiresRole: [ROLES.CAMPUS_LEAD, ROLES.LEAD_ENABLER] },
  { id: "campus-manage-actions", navId: "campus-manage", title: "Manage Students", description: "TBD", requiresRole: [ROLES.CAMPUS_LEAD, ROLES.LEAD_ENABLER], requiresFlag: (u) => hasPermission(u, "campus:manage") },
  { id: "campus-view-dashboard", navId: "campus-manage", title: "Campus Metrics", description: "TBD", requiresRole: [ROLES.CAMPUS_LEAD, ROLES.LEAD_ENABLER], requiresFlag: (u) => hasPermission(u, "campus:view_dashboard") },

  // role-gated: Zonal Campus Lead (§5.7)
  { id: "zonal-dashboard", navId: "zonal", title: "Zonal Dashboard", description: "TBD", requiresRole: [ROLES.ZONAL_CAMPUS_LEAD] },
  { id: "zonal-comparison", navId: "zonal", title: "Comparison Views", description: "TBD", requiresRole: [ROLES.ZONAL_CAMPUS_LEAD] },

  // role-gated: District Campus Lead (§5.8)
  { id: "district-dashboard", navId: "district", title: "District Dashboard", description: "TBD", requiresRole: [ROLES.DISTRICT_CAMPUS_LEAD] },

  // permission-gated: everyone holding "events:manage" — Admin (no tour), Campus Lead,
  // Lead Enabler, Company, Enabler, Mentor, Zonal Campus Lead, District Campus Lead
  // (static grants, permissions.ts:76-85), plus any " IGLead"/" CampusLead"-suffixed
  // dynamic role (permissions.ts:190-191). One shared step, not duplicated per persona —
  // mirrors the `talent-pool` step's shared-gate pattern (§5.2/§5.3).
  { id: "manage-events", navId: "manage-events", title: "Manage Events", description: "TBD", requiresFlag: (u) => hasPermission(u, "events:manage") },

  { id: "finish", navId: "home", title: "You're all set", description: "TBD" },
];
```

Notes:
- `talent-pool` step is intentionally reachable by both Mentor and Company —
  `app-sidebar.tsx:79-84` already treats it as a shared/gated item (locked pre-
  verification for unverified companies); tour step should skip if the nav item renders
  in its locked state (`isRestrictedCompanyFeature`), not spotlight a disabled link. Add
  this check in `buildSteps` or at highlight time.
- Company gets **no** `mujourney`/`learning-circle`/etc. steps — not because of an
  exclusion rule, but because those steps have no `requiresRole` and are visible to
  everyone by default; if a future change makes them Company-invisible in `NAV_ITEMS`,
  the tour step list must be updated in lockstep (documented as a maintenance note, §12).
- `intern`, `campus`, `zonal`, `district` no longer have their own `steps/*.ts` files —
  §5.5-§5.8 folded them into the single `dashboard` tour key (base steps 1-12 + their
  role-gated additions), so `dashboardSteps` above is now the single source for every
  persona in §5.1-§5.8. This is the unresolved architectural mismatch already flagged in
  §4/§9.1: `campus-manage`/`zonal`/`district`/`intern-dashboard`/`weekly-twitches-manage`
  are `data-tour-id`s that live on `/dashboard/campus/manage`, `/dashboard/zonal`,
  `/dashboard/district`, `/dashboard/intern` respectively, not on `/dashboard` — so on
  the `dashboard` tour's actual launch route (`/dashboard`, §6.1 condition 2) none of
  these elements exist in the DOM, and `useTour`'s `document.querySelector` filter
  (§7.6) drops every one of them before launch. As written, Campus/Zonal/District/Intern
  leads get only the base 1-12 + shared Finish — the role-gated rows never actually
  render. Fixing this for real requires either giving these roles a `/dashboard` home
  route, or moving their `data-tour-id`s onto the `/dashboard` sidebar, or reverting
  these four to their own tour keys/routes (as they were before this restructure).
- `requiresFlag: (u) => hasPermission(u, "campus:manage")` / `"campus:view_dashboard"`
  is illustrative — confirm the actual permission-check helper name in
  `src/lib/auth/permissions.ts` before implementing; `TourStep.requiresFlag` (§7.4) takes
  any `(user: ServerUser) => boolean`, so it can wrap whatever that helper turns out to
  be.

### 7.6 `useTour` hook

```ts
// src/features/tour/hooks/use-tour.ts
"use client";

export function useTour(
  tourKey: TourKey | null,
  steps: TourStep[],
  initialState: TourCookiePayload,
  user: ServerUser,
) {
  const pathname = usePathname();
  const [state, setState] = useState(initialState);
  const hasLaunchedRef = useRef(false); // guards against double-launch on re-render

  useEffect(() => {
    if (!tourKey || hasLaunchedRef.current) return;
    if (pathname !== getRoleHomePath(user.roles)) return;
    if (document.querySelector('[role="dialog"][data-state="open"]')) return;

    const seen = state[tourKey];
    if (seen && seen.version >= TOUR_VERSIONS[tourKey]) return;

    const resolved = steps.filter((s) => document.querySelector(`[data-tour-id="${s.navId}"]`));
    if (resolved.length === 0) return;

    hasLaunchedRef.current = true;
    launchDriver(resolved, {
      onSkip: () => void commitOutcome("skipped"),
      onComplete: () => void commitOutcome("completed"),
    });

    async function commitOutcome(outcome: TourOutcome) {
      setState((prev) => ({ ...prev, [tourKey]: { version: TOUR_VERSIONS[tourKey], outcome } }));
      await recordTourOutcome(tourKey, outcome);
    }
  }, [tourKey, pathname, state, steps, user]);
}
```

- `hasLaunchedRef` prevents relaunch on unrelated re-renders within the same page load
  (e.g. a sibling component re-rendering after a query refetch) — without it, `useEffect`
  could refire and Driver.js would double-init.
- DOM-existence check (`document.querySelector` per step) happens both at step-resolve
  time (drop steps with no matching element before launch) and should also be re-checked
  by Driver.js's own `onHighlightStarted` if the DOM changes mid-tour (e.g. collapsible
  sidebar re-render) — log `console.warn` in non-production builds so missing-target
  regressions surface in QA, never in prod analytics as silent drop-off (there is no
  analytics here to drop off into, so this is purely a dev-time safety net).

### 7.7 `driver.js` adapter

Thin wrapper isolating the third-party API so it can be swapped later without touching
`useTour` or step definitions:

```ts
// src/features/tour/lib/driver-adapter.ts
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function launchDriver(
  steps: TourStep[],
  handlers: { onSkip: () => void; onComplete: () => void },
) {
  const d = driver({
    showProgress: true,
    steps: steps.map((s) => ({
      element: `[data-tour-id="${s.navId}"]`,
      popover: { title: s.title, description: s.description },
    })),
    onDestroyStarted: () => {
      if (!d.isLastStep()) handlers.onSkip();
      else handlers.onComplete();
      d.destroy();
    },
  });
  d.drive();
}
```

`onDestroyStarted` fires for Skip, Esc, outside-click, and natural Finish — Driver.js
doesn't distinguish these by default, so `d.isLastStep()` is the signal used to tell
Finish apart from every other exit path (§6.2 requirement that Esc/outside-click count
as Skip, not a silent no-op).

---

## 9. Integration Points (exact files touched)

### 8.1 `src/app/(dashboard)/layout.tsx` (existing file — edit)
Add `getTourState()` to the existing `Promise.all` alongside `getWhatsNewState()`, fetch
`getServerUser()` (already used elsewhere in the app — confirm it's available here or add
it), pass both into a new `<TourController>` mounted next to `<WhatsNewPopup>`.

### 8.2 `src/components/dashboard/app-sidebar.tsx` (existing file — edit)
Line ~104: add `data-tour-id={item.id}` to the rendered `<Link>` inside `renderNavItem`.
One-line change, no behavior change to existing sidebar functionality.

### 8.3 `package.json` (existing file — edit)
`bun add driver.js` — new dependency, not currently present anywhere in the repo
(confirmed: no `driver.js`/`driverjs` import exists today).

### 8.4 `src/app/api/auth/logout/route.ts` (existing file — edit)
Add cookie deletion alongside the existing `clearWhatsNewCookie()` call and the
`accessToken`/`refreshToken`/`isAuthenticated`/`tempToken` deletions already there
(`logout/route.ts:8-35`):

```ts
cookieStore.delete({
  name: TOUR_COOKIE_NAME,
  httpOnly: true,
  secure: TOUR_COOKIE_OPTIONS.secure,
  sameSite: TOUR_COOKIE_OPTIONS.sameSite,
  path: TOUR_COOKIE_OPTIONS.path,
});
```

### 8.5 Manual replay entry point (new UI, exact placement TBD)
Add "Take a Tour" action to the user/profile menu. Calls `launchDriver(fullSteps, {...})`
directly (bypassing `useTour`'s cookie-version check per §6.3), commits cookie only on
completion.

---

## 10. Edge Cases

| Case | Behavior |
|---|---|
| User has no matching tour key (e.g. Discord Moderator) | `resolveTourKey` returns `null`, `TourController` renders nothing |
| Admin navigates to `/dashboard/zonal` manually | No tour — role check happens before route check in `resolveTourKey`/`useTour`, independent of which route they're on |
| Cookie is corrupted/tampered (invalid JSON) | `readPayload` catches parse error, returns `{}` — treated as never-seen, tour launches; not a crash |
| User has multiple qualifying roles (e.g. Mentor + Company) | Both role-gated step sets included (steps aren't mutually exclusive, `some()` check per step) |
| Sidebar collapsed to icon-only (`isCollapsed` state, `app-sidebar.tsx`) | `data-tour-id` attribute is on the same `<Link>` regardless of collapsed state — Driver.js can still target it; popover text should be reviewed at implementation time in case a collapsed icon target is too small for a comfortable highlight box |
| Company account unverified (`isCompanyVerified === false`) | Company-restricted steps (`talent-pool`, `company-jobs`, etc.) render as locked (`isRestrictedCompanyFeature`, `app-sidebar.tsx:73-84`) — tour must skip these or explicitly acknowledge the locked state, not spotlight a disabled link as if clickable |
| Mentor not yet verified (`isMentorVerified === false`) | `mentor-sessions` / `mentor-task-requests` steps gated via `requiresFlag`, same as the nav item's own `dynamicCheck` in `nav-config.ts` |
| User logs out mid-tour | Driver.js overlay is torn down by the route change to `/login`; `onDestroyStarted` may fire as a Skip on unmount — acceptable, cookie write only matters for the next session, and logout clears the cookie anyway (§9.4) making the write moot |
| Two tabs open, tour completed in tab A | Tab B has stale in-memory `state` (its own `useState` from initial SSR read) and could relaunch the tour if navigated to the home route — acceptable given cookie-only (no cross-tab sync) design; low-frequency scenario, not worth a `BroadcastChannel` for a one-time onboarding flow |
| `TOUR_VERSIONS[tourKey]` bumped (new version shipped) | Full replay for any user whose cookie has `version < new value` — no delta logic in this feature (see §3 Non-Goals) |

---

## 11. Testing Plan

Repo uses Vitest + Testing Library (`vitest.config.ts`, `@testing-library/react`).

- **Unit** (`src/features/tour/lib/*.test.ts`):
  - `buildSteps`: role filtering, flag filtering, combination of both.
  - `resolveTourKey`: every role → correct tour key or `null`, including Admin/Associate
    → `null` even when other qualifying roles are also present.
  - Cookie payload parse/serialize round-trip, including corrupt-JSON fallback.
- **Component** (`use-tour` hook, via `@testing-library/react` `renderHook`):
  - Does not launch when not on home route.
  - Does not launch when cookie version is current.
  - Does not launch when a dialog is open.
  - Launches when all conditions hold and DOM targets exist.
  - Does not launch twice on re-render (`hasLaunchedRef` guard).
- **Manual QA per persona** (no automated E2E in this repo currently — confirm before
  assuming Playwright/Cypress is available):
  - Log in as each role in §4's table, verify correct tour (or no tour) launches only on
    that role's home route.
  - Verify Skip and Finish both write the cookie and suppress relaunch.
  - Verify logout clears the cookie (DevTools → Application → Cookies) and a fresh login
    (same or different account) sees the tour again.
  - Verify collapsed-sidebar targeting still highlights correctly.
  - Verify unverified Company/Mentor accounts don't get spotlighted onto locked nav items.

---

## 12. Maintenance Notes

- Whenever `NAV_ITEMS` in `nav-config.ts` changes (new item, removed item, id renamed),
  check whether any `steps/*.ts` file references the old `navId` — no automated link
  between the two today; a future improvement could add a lint/test asserting every
  `TourStep.navId` exists in `NAV_ITEMS`.
- Whenever a step's underlying nav item is added/changed in a way that changes the
  guided workflow, bump `TOUR_VERSIONS[tourKey]` in `constants.ts` to force a replay.

---

## 13. Implementation Checklist (A→Z)

- [ ] `bun add driver.js`
- [ ] Create `src/features/tour/` folder per §8.1 structure
- [ ] `constants.ts` — `TOUR_VERSIONS` (5 keys: dashboard/intern/campus/zonal/district),
      `TOUR_COOKIE_NAME = "mulearn-tour"`, `TOUR_COOKIE_OPTIONS`
- [ ] `types.ts` — `TourKey`, `TourState`, `TourCookiePayload`, `TourStep`
- [ ] `actions.ts` — `getTourState`, `recordTourOutcome` (mirrors `whats-new-actions.ts`)
- [ ] `lib/resolve-tour-key.ts` — role → `TourKey | null`, Admin/Associate always `null`
- [ ] `lib/build-steps.ts` — role/flag filtering
- [ ] `lib/driver-adapter.ts` — `launchDriver` wrapper, Skip vs Finish detection via
      `isLastStep()`
- [ ] `steps/dashboard.ts` — full step list per §5 and §8.5 (placeholder copy)
- [ ] `steps/intern.ts`, `steps/campus.ts`, `steps/zonal.ts`, `steps/district.ts` —
      smaller per-persona lists, same shape
- [ ] `hooks/use-tour.ts` — launch-condition logic, `hasLaunchedRef` guard
- [ ] `components/tour-controller.tsx` — client component wiring `useTour` + rendering
      nothing visible itself (Driver.js manages its own overlay DOM)
- [ ] `components/replay-tour-button.tsx` — manual full-replay trigger
- [ ] Edit `src/components/dashboard/app-sidebar.tsx` — add `data-tour-id={item.id}` to
      nav link (§9.2)
- [ ] Edit `src/app/(dashboard)/layout.tsx` — fetch `getTourState()` + `getServerUser()`,
      mount `<TourController>` (§9.1)
- [ ] Edit `src/app/api/auth/logout/route.ts` — delete `mulearn-tour` cookie (§9.4)
- [ ] Add "Take a Tour" entry point to user/profile menu (§9.5, exact placement TBD)
- [ ] Unit tests: `resolveTourKey`, `buildSteps`, cookie parse/serialize (§11)
- [ ] Hook tests: `use-tour` launch-condition matrix (§11)
- [ ] Manual QA pass across all personas in §4/§5 (§11)
- [ ] **Content pass**: replace all `"TBD"` placeholder titles/descriptions with real
      copy before shipping to production (§6.4 — explicitly not engineering's call, but
      must not be silently forgotten)
- [ ] Confirm final placement of "Take a Tour" UI with design/product before merging §9.5

---

## 14. Future Work (explicitly out of scope now)

- Delta tours (`introducedInVersion` per-step filtering) if full-replay fatigue becomes
  a real user complaint after launch.
- Cross-device sync, if product decides cookie-only is insufficient later (would require
  the backend `tourProgress` field design from the earlier v2 draft).
- Analytics on skip/completion/drop-off step, if product wants funnel data (would need a
  telemetry sink — none exists in this repo today).
- Contextual/inline tours for individual features (task creation flow, event creation
  flow, etc.) — separate feature, not this one.
