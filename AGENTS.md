# Spooky Monopoly

Spooky Monopoly (`spooky-monopoly`) is a single-player browser property game originally made for Weird Web October 2025. It uses the Next.js App Router and TypeScript. The browser runs the game and stores token unlocks. Optional Supabase-backed global statistics aggregate results across games.

## Layout

- [README.md](README.md) is the human entry point and product description.
- [app/page.tsx](app/page.tsx) and [app/layout.tsx](app/layout.tsx) render the game page and layout.
- [app/game/](app/game/) holds the board, gameplay components, static board and token data, and game utilities.
- [app/api/](app/api/) contains the results submission and statistics handlers. [next.config.ts](next.config.ts) preserves the legacy URLs.
- [docs/](docs/) describes the product, architecture, setup, development workflow, and decisions.
- [roadmap/](roadmap/) contains the ordered backlog and the history of completed and cancelled work.

## Working agreements

Use Node.js 22 or later and pnpm 12. Run `pnpm install` to install dependencies, `pnpm dev` for local development, `pnpm typecheck` for TypeScript checks, and `pnpm build` followed by `pnpm start` to verify the production app. The repository currently has no test or lint script. Follow the [manual checks](docs/development.md) for the area you change.

The game must remain playable with no Supabase configuration. For statistics work, use the existing table contract and configuration documented in [Getting started](docs/getting-started.md). Keep `.env.local` and generated files out of commits. Check both current and original Weird Web October URLs when changing routing.

## Documentation

Update the [overview](docs/overview.md) when the player-facing scope changes, the [setup guide](docs/getting-started.md) when prerequisites or settings change, and the [architecture](docs/architecture.md) or [decisions](docs/decisions.md) when boundaries or contracts change. Keep the [README](README.md) and guides consistent. See [Contributing](docs/contributing.md) for verification and roadmap expectations.

## Roadmap

This project's key is `spooky-monopoly` and its title is `Spooky Monopoly`. Keep the
roadmap in three files in `roadmap/` at the repository root.

- [roadmap/roadmap.json](roadmap/roadmap.json) holds the project status and items still to do, highest priority first.
- [roadmap/completed.json](roadmap/completed.json) holds finished items.
- [roadmap/cancelled.json](roadmap/cancelled.json) holds items that will not be done.

All three use this shape.

```json
{
  "schema": "name -roadmap/v1",
  "file": "roadmap",
  "updatedAt": "2026-10-14T09:30:00+11:00",
  "project": {
    "key": "spooky-monopoly",
    "title": "Spooky Monopoly",
    "status": "active",
    "summary": "A single-player browser property game with local token unlocks and optional shared statistics."
  },
  "items": [
    {
      "id": "stable-kebab-id",
      "title": "Short imperative title",
      "group": "Optional area",
      "notes": "Optional detail"
    }
  ]
}
```

1. `schema` is always `"name -roadmap/v1"`. `file` is `"roadmap"`, `"completed"` or `"cancelled"` to match the filename.
2. `project.key`, `project.title` and `project.status` are identical in all three files. Never change `project.key`. `status` is `active`, `paused` or `complete`. `summary` appears only in `roadmap.json`.
3. Every item has an `id`: lowercase kebab-case, unique across all three files, never renamed and never reused, even after the item is completed or cancelled. Titles and notes may be edited freely. The id stays the same.
4. Allowed item fields are `id`, `title`, `group` and `notes`, plus `completedAt` (`completed.json` only, required) and `cancelledAt` with an optional `reason` (`cancelled.json` only). Add no other fields.
5. When work is finished, move the item from `roadmap.json` to the end of `completed.json` and add `completedAt`. When it is dropped, move it to the end of `cancelled.json` and add `cancelledAt` and a short `reason`. Never delete an item outright. If a cancelled item is revived, move it back to `roadmap.json` with the same id and remove `cancelledAt` and `reason`.
6. Each item is in exactly one file. Split work into new items with new ids rather than changing what an existing id means.
7. Set `updatedAt` in every file you change. Timestamps are ISO 8601 with a UTC offset, for example `2026-10-14T09:30:00+11:00`.
8. Keep `roadmap.json` items in priority order. Titles are at most 500 characters. Notes and reasons are at most 20,000 characters. Use at most 2,000 items per file.
9. Output valid JSON only, with UTF-8 encoding, two-space indentation, no comments, and no trailing commas. Create a missing file with an empty `items` array.
10. Update the roadmap in the same change as the work it describes. Mark an item completed only when that work is actually done.

The format contract for other repositories this repo will import is in [docs/roadmap-format.md](docs/roadmap-format.md).

## Do and don't

- Prefer small diffs that preserve the single-player game flow.
- Update the roadmap with the work and keep existing roadmap ids intact.
- Describe APIs the app actually implements. Avoid inventing endpoints or data contracts.
