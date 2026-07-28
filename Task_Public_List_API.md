# Task Public List API

## Endpoint

`GET /api/v1/dashboard/task/list/`

**View:** `TaskPublicListAPI` — [api/dashboard/task/dash_task_view.py:34](../api/dashboard/task/dash_task_view.py#L34)
**URL config:** [api/dashboard/task/urls.py:19](../api/dashboard/task/urls.py#L19)

Returns active tasks grouped into three journey sections — `start_journey`, `become_expert`, `events` — instead of one flat list. Authentication is optional (`CustomizePermission`); unauthenticated callers get a restricted view.

---

## Authentication

Optional. Uses `JWTUtils.is_logged_in(request)` internally:
- **Authenticated**: gets all three sections — `start_journey` (scoped to their verified campus org(s) plus global tasks), `become_expert`, and `events`.
- **Unauthenticated**: gets `start_journey` only (global-task visibility rules). `become_expert` and `events` are always returned as empty arrays — no company/IG/event tasks are exposed without auth.

---

## Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `ig_id` | string (UUID) | No | Overrides which Interest Group's tasks appear in `become_expert`. Defaults to every IG the caller actively belongs to (`UserIgLink.is_active=True`). Only takes effect for authenticated callers — `become_expert` is always empty when unauthenticated, regardless of this param. |

There is no pagination, `search`, `sortBy`, or `task_source` param anymore — each section returns its full task list (these are small, fixed-size lists, not open-ended feeds).

---

## Response Sections

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

### `start_journey`

Generic, level-ordered tasks (ordered by `level.level_order`, then `title`). Excludes:
- IG-specific tasks (`ig` is not null)
- Event-linked tasks (`event_fk` is not null)
- "Intern" tasks — same convention used by `get_karma_breakdown` (`api/dashboard/profile/profile_serializer.py`): hashtag starting with `#intern-`, OR the task's `requested_by` user holds an active `Intern`/`Intern Lead` role (`UserRoleLink`).

Standard org visibility rules still apply (campus-scoped tasks only visible to verified members of that campus).

### `become_expert`

**Authenticated only** — always `[]` for unauthenticated callers.

The caller's IG task(s) **plus** company-submitted tasks, ordered by `level.level_order` then `title`.

- **IG tasks**: by default, tasks whose `ig` is one the caller actively belongs to (`UserIgLink.is_active=True`). Pass `?ig_id=<uuid>` to view a specific IG's tasks instead (overrides the default — not additive, and not restricted to IGs the caller belongs to).
- **Company tasks**: tasks whose `requested_by` user has a linked `Company` profile (`requested_by__company_profile__isnull=False`) — same convention used elsewhere in the codebase (`dash_task_view.py` `task_source=="company"` filter).
- Event-linked tasks are excluded here even if they'd otherwise match (they belong in `events`).

### `events`

**Authenticated only** — always `[]` for unauthenticated callers.

Event-linked tasks (`event_fk` is not null) where the linked `Event` is `PUBLISHED` or `ONGOING` and within the caller's visibility scope — same scope logic as `EventTaskPublicListAPI` (`_build_scope_filter`, `_get_viewer_id` in `api/dashboard/events/public_views.py`). Ordered by `event_fk__title`, then `title`.

---

## Task object fields (`TaskListPublicSerializer`)

Same shape in all three sections. Serializer: [api/dashboard/task/dash_task_serializer.py:10](../api/dashboard/task/dash_task_serializer.py#L10)

| Field | Type | Notes |
|---|---|---|
| `id` | string | Task UUID |
| `hashtag` | string \| null | |
| `title` | string | |
| `description` | string \| null | |
| `karma` | int | |
| `channel` | string \| null | `channel.name` |
| `discord_id` | string \| null | `channel.discord_id` |
| `type` | string | `type.title` |
| `variable_karma` | bool | |
| `level` | string \| null | `level.name` |
| `ig` | string \| null | `ig.name` |
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