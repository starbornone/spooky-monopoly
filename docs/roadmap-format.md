# Roadmap import format

Import three UTF-8 JSON files from the repository-root `roadmap/` directory. Each file holds one state of work for the same project. Use two-space indentation, no comments, and no trailing commas. If a file is missing when setting up a repository, create it with the shared project metadata and an empty `items` array.

| Path | `file` value | Item order |
| --- | --- | --- |
| `roadmap/roadmap.json` | `roadmap` | Highest priority first. |
| `roadmap/completed.json` | `completed` | Append newly completed work. |
| `roadmap/cancelled.json` | `cancelled` | Append newly cancelled work. |

## Fields

| Field | Rules |
| --- | --- |
| `schema` | Required string with the exact value `"name -roadmap/v1"`, including the space before the hyphen. |
| `file` | Required string matching the filename as shown above. |
| `updatedAt` | Required ISO 8601 timestamp with a UTC offset. Refresh it in every file changed. On first creation, use the same timestamp in all three files. |
| `project.key` | Required lowercase kebab-case string. Shared across the three files and permanent after first publication. |
| `project.title` | Required project display title, identical in all three files. |
| `project.status` | Required string, one of `active`, `paused`, or `complete`. Use the same value in all three files. It describes the project as a whole. |
| `project.summary` | Optional one-line string in `roadmap.json` only. |
| `items` | Required array. Allow up to 2,000 records per file. Empty arrays are valid. |

Each item is an object with the fields below. Use only the fields allowed for its current file.

| Field | Rules |
| --- | --- |
| `id` | Required lowercase kebab-case string, such as `verify-original-urls`. Unique across all three files and permanent. |
| `title` | Required short imperative string, up to 500 characters. |
| `group` | Optional area label. |
| `notes` | Optional detail, up to 20,000 characters. |
| `completedAt` | Required in `completed.json` only. ISO 8601 timestamp with a UTC offset. |
| `cancelledAt` | Required in `cancelled.json` only. ISO 8601 timestamp with a UTC offset. |
| `reason` | Optional string in `cancelled.json` only, up to 20,000 characters. Provide a short reason when moving an item to cancelled. |

Lowercase kebab-case uses letters and digits separated by single hyphens and matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Importers can identify work by the pair `project.key` and `item.id`. Titles, groups, and notes can change as the work becomes clearer. Give different work a new id and keep every existing item in exactly one of the three files.

## Move items with the work

- **To do → completed** — Remove the item from `roadmap.json`, append it to `completed.json`, and set `completedAt` when the work is actually done.
- **To do → cancelled** — Remove the item from `roadmap.json`, append it to `cancelled.json`, and set `cancelledAt` and a short `reason`.
- **Cancelled → to do** — Remove the item from `cancelled.json`, restore it at the appropriate priority in `roadmap.json`, and remove `cancelledAt` and `reason`.
- **Completed → to do** — Reopen the same id only if the original completion is being reversed. Remove `completedAt` and restore the item at the appropriate priority. Give follow-up work its own id.

Update every affected file's `updatedAt` and make the move in the same change as the work. Never delete an item outright. See [Contributing](contributing.md) for the repository workflow and [AGENTS.md](../AGENTS.md) for the Spooky Monopoly rules.

## Minimal valid examples

These three examples form one valid set for a sample repository.

### `roadmap/roadmap.json`

```json
{
  "schema": "name -roadmap/v1",
  "file": "roadmap",
  "updatedAt": "2026-10-14T09:30:00+11:00",
  "project": {
    "key": "sample-game",
    "title": "Sample Game",
    "status": "active"
  },
  "items": [
    {
      "id": "verify-original-urls",
      "title": "Verify original URLs"
    }
  ]
}
```

### `roadmap/completed.json`

```json
{
  "schema": "name -roadmap/v1",
  "file": "completed",
  "updatedAt": "2026-10-14T09:30:00+11:00",
  "project": {
    "key": "sample-game",
    "title": "Sample Game",
    "status": "active"
  },
  "items": [
    {
      "id": "document-local-setup",
      "title": "Document local setup",
      "completedAt": "2026-10-14T09:30:00+11:00"
    }
  ]
}
```

### `roadmap/cancelled.json`

```json
{
  "schema": "name -roadmap/v1",
  "file": "cancelled",
  "updatedAt": "2026-10-14T09:30:00+11:00",
  "project": {
    "key": "sample-game",
    "title": "Sample Game",
    "status": "active"
  },
  "items": [
    {
      "id": "duplicate-setup-page",
      "title": "Create a second setup page",
      "cancelledAt": "2026-10-14T09:30:00+11:00"
    }
  ]
}
```
