# Interest Group Think Tank — muid-based list (like Leads/Mentors) — Plan

| | |
|---|---|
| **Status** | Planning — not yet implemented |
| **Owner** | Frontend (mulearn-dashboard) |
| **Backend status** | **Unconfirmed / likely not yet changed** — see §4 |
| **Requested by** | Sachin Raj M |
| **Last updated** | 2026-07-25 |

## 1. What's changing

Today `thinktank` is a single free-text field (labeled "Thinktank URL" in the create wizard, placeholder `"e.g. #web-thinktank"` in the edit sheet) — effectively a URL/slug, not a person. Sachin wants it changed to a **muid-based list of people**, structurally identical to how `leads` and `mentors` already work: pick people via `MuidSearchInput`, store as `[{muid}, ...]` on write, get back `[{muid, full_name, profile_pic, socials...}, ...]` on read.

Sidebar/detail-page display order also changes. Current order is:

**Quick Info** (Office Hours → Thinktank text line → Resource button) → **Community Leads** → *(Mentors renders separately, full-width in the main content column, unchanged)*

New order:

**Quick Links** (Office Hours + Resource only, Thinktank removed from this card) → **Think Tanks** (new card, `PersonCard` list — same visual treatment as Leads) → **IG Leads** (unchanged card, just now second-to-last instead of second) → **Mentors stays exactly where it is today** (full-width card in the main column) — Sachin was explicit that mentors' position doesn't move.

## 2. Backend dependency — this is the actual blocker

Every current `thinktank` field, on every schema, is `z.string().nullable().optional()` — a plain string, not an array. The `leads`/`mentors` pattern this needs to mirror only works because the backend already accepts/returns `leads`/`mentors` as arrays of `{muid}` (write) / `{muid, full_name, profile_pic, socials}` (read).

**Nothing in this repo currently sends or receives `thinktank` as anything but a string.** Before any FE muid-picker UI can work end-to-end, the backend needs to:
- Accept `thinktank` as `[{muid: string}, ...]` on `POST /ig/`, `PUT /ig/{pk}/`, `PATCH /ig/get/{pk}/` (same shape as `leads`/`mentors` on those same endpoints).
- Return `thinktank` as `[{muid, full_name, profile_pic, socials}, ...]` on every read endpoint that currently returns it as a string (`GET /ig/get/{pk}/`, `GET /ig/list/`, etc.) — same serializer treatment `leads`/`mentors` already get.

This is the same kind of dependency the cover/icon image work had (see `docs/ig-cover-icon-image-plan.md` §11) — that one got resolved by backend already shipping the change; this one has not been confirmed yet. **Recommend getting a written backend contract (like the API doc that drove the image work) before starting implementation**, so field names/shapes are locked in rather than guessed.

## 3. Full inventory of affected frontend code

### 3.1 Schemas

| File | Current | Change |
|---|---|---|
| `src/features/manage-ig/schemas/manage-ig.schema.ts:95` | `thinktank: z.string().nullable().optional()` (in the shared schema `InterestGroupCreateSchema`/`UpdateSchema` derive from) | Replace with the same union pattern already used for `leads`/`mentors` (lines 38-94): `z.union([array-of-{muid,...}, array-of-string, string]).nullable().optional()` — write side only ever sends `[{muid}]` |
| `src/features/interest-groups/schemas/interest-groups.schema.ts:72` | `thinktank: z.string().optional().nullable()` (in `InterestGroupDetailSchema`, grouped with `resource`/`office_hours` as "simple string" fields today) | Replace with the same shape `leads`/`mentors` use at lines 110-162 — plain `z.array(z.object({muid, full_name, profile_pic, socials...}))`, moved out of the "simple string" grouping |
| `src/features/ig-requests/schemas/ig-requests.schema.ts:40,82` | `thinktank: z.string()...` | **Out of scope for now** — the member-facing IG *request* flow has no muid-picker anywhere today and no leads/mentors equivalent to mirror; Sachin's ask is about the admin create/edit + detail display, not the request form. Flag as a follow-up if requesters should eventually be able to name a think tank too. |

### 3.2 Admin create/edit wizard — `ig-form-dialog.tsx`

- State: add `thinktankMuids: string[]` alongside existing `leadMuids`/`mentorMuids` (currently lines 222-223).
- The shared `extract()` helper (lines 274-289) that populates `leadMuids`/`mentorMuids` from `initialData.leads/mentors` already handles "muid or name, from any array shape" generically — reuse it for `initialData.thinktank` once the schema changes (same call pattern, third line: `setThinktankMuids(extract(initialData?.thinktank))`).
- Step 3 "Team & Schedule" (around lines 795-839): today Office Hours + Thinktank share one `Input`-pair grid row (829-838, `register("thinktank")`, label "Thinktank URL"). Replace that with a third `MuidSearchInput` row next to Leads/Mentors (mirroring 800-814), and move Office Hours to stand alone (or pair with Resource instead — cosmetic call, not load-bearing).
- Submit payload (lines 313-323): add `thinktank: thinktankMuids.map((m) => ({ muid: m }))` alongside the existing `leads`/`mentors` lines.
- Step 4 Review (around line 932): swap the raw Thinktank URL string display for a joined muid list, same treatment as Leads/Mentors get at lines 919-930.

### 3.3 Admin sheet edit — `edit-interest-group-form.tsx`

- `toMuidArray()` (lines 56-71) already generic — reuse directly for `group.thinktank` once its type is an array.
- Replace the plain `thinktank` string state (line 104) with `thinktankMuids` state via `toMuidArray(group.thinktank)`, matching `leads`/`mentors` at lines 130-131.
- Remove the `ig-thinktank` text `Input` (lines 403-411) from the Basic Info fieldset.
- Add a new fieldset for Think Tank, structurally identical to the Leads/Mentors fieldsets at lines 538-559 — just a `MuidSearchInput` bound to `thinktankMuids`.
- Diff-based payload building (line 185-186 today does `if (thinktank !== ...) payload.thinktank = thinktank`) — replace with the same `JSON.stringify(...) !== JSON.stringify(...)` array-diff pattern already used for `leads`/`mentors` (lines 208-217), sending `thinktank: thinktankMuids.map(m => ({muid: m}))` only when changed.

### 3.4 Detail pages — reorder + convert to person list

Both `src/features/interest-groups/components/interest-group-detail-client.tsx` (public) and `src/features/manage-ig/components/ig-detail.tsx` (admin) share the same sidebar structure and need the identical change:

- **Quick Info card** (public: ~404-454, admin: ~395-443) — remove the Thinktank text line entirely; keep Office Hours + the "Access Resources" button. Consider renaming the card heading from "Quick Info" to **"Quick Links"** per Sachin's naming.
- **New Think Tanks card** — insert directly after Quick Links and before Community Leads, rendering `group.thinktank.map(person => <PersonCard ... />)` exactly like the existing Leads card does (public: lines 456-481, admin: lines 445-469) — same component, same `avatarBgClass`/`accentClass` props, just a different data source and heading ("Think Tanks").
- **Community Leads card** — unchanged content, now renders third instead of second.
- **Mentors** — explicitly do not move; it stays as the full-width card in the main content column (public: ~349-375, admin: ~340-366), untouched by this change.
- The static cosmetic help-text box that currently says "...reach out to the leads or join the think tank channel" (public ~483-488, admin ~471-477) — reword once thinktank is a people-list rather than a channel link (the "join the channel" phrasing won't make sense anymore).

### 3.5 Admin sheet detail panel — `ig-detail-panel.tsx`

- Currently `hasLinks` (line 184) bundles Thinktank in with Resource/Office Hours under one "Links" `DetailSection` block (Resources → Thinktank string → Office Hours, lines ~375-399).
- Pull Thinktank out of that block. Two options: (a) add it as a third column/section next to the existing Leads/Mentors `DetailSection` grid (lines ~320-368), rendering muids the same plain-text way Leads does there (330-341) — this panel doesn't use `PersonCard`, just name/muid text; or (b) match the fuller detail pages and use `PersonCard` here too for consistency. Recommend (b) for visual consistency across all three surfaces, but (a) is lower-effort if this panel is meant to stay a compact list view.

### 3.6 API layer

No changes needed in `manage-ig.api.ts`, `use-manage-ig.ts`, or `use-edit-interest-group.ts` — confirmed these have zero thinktank-specific code today; `buildIgFormData`'s generic JSON-stringify-any-object-or-array logic (manage-ig.api.ts lines 30-51) already handles this once the payload shape changes at the call sites in §3.2/§3.3. `ig-requests.api.ts` stays untouched per §3.1 (out of scope).

## 4. Open questions for backend (must resolve before implementation)

1. Confirm `thinktank` accepts `[{muid}]` on Create/Update, mirroring `leads`/`mentors` exactly — which endpoints, what validation errors (invalid muid, etc.)?
2. Confirm read endpoints return `thinktank` as `[{muid, full_name, profile_pic, socials}]` — which serializer, same shape as leads/mentors or a reduced one (e.g. no socials)?
3. Is there a cap on how many people can be listed as "think tank" (leads/mentors have no documented cap today, per current schemas) — should there be one?
4. Does the member-facing IG *request* flow need a thinktank field at all going forward, or does it get dropped there too (like `icon` was dropped from Create/Request in the image change)?

## 5. Suggested rollout order (once backend confirms §4)

1. Schema changes (§3.1) — additive/type-only, safe first step once backend shape is locked.
2. `ig-form-dialog.tsx` + `edit-interest-group-form.tsx` muid-picker wiring (§3.2, §3.3).
3. Detail-page reorder + Think Tanks card (§3.4) on both public and admin detail pages.
4. Admin sheet panel (§3.5) — lowest priority, compact view least visible.
5. Reword the cosmetic "think tank channel" copy (§3.4) as part of step 3, not a separate pass.
