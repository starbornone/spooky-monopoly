# Decisions

These records describe choices already reflected in the [README](../README.md) and the implementation.

## 1. Use the Next.js App Router and TypeScript

**Context** — The game needs an interactive board and server endpoints for shared results.

**Decision** — Use one Next.js application. Keep the page and handlers under `app/`, and use TypeScript across both.

**Consequences** — The development and production scripts cover the board and its API together. A host serving shared statistics needs the Next.js server runtime. See [Architecture](architecture.md).

## 2. Keep the game playable without Supabase

**Context** — Shared results need an existing Supabase table. A local player only needs the game and browser storage for unlocks.

**Decision** — Keep turn state and unlocks in the browser. Use Supabase for result submission and aggregation when configured.

**Consequences** — Local play requires no database setup. Unlocks are specific to the browser and origin. Global statistics can be unavailable while play continues. See [Getting started](getting-started.md).

## 3. Preserve the original event URLs

**Context** — Weird Web October links and the earlier API paths use the `/2025/spooky` prefix. The standalone project opens at the root.

**Decision** — Serve the game at `/` and use rewrites for the original page and statistics URLs.

**Consequences** — Both sets of URLs reach the same implementations. Routing changes should verify both forms, including the method used by each API handler. See [Development](development.md).

## 4. Keep the roadmap in three JSON files

**Context** — Maintainers need an ordered list of upcoming work, and importers need a reliable way to identify an item across its lifetime.

**Decision** — Store open, finished, and dropped work in separate files with a shared project identity and permanent item ids.

**Consequences** — Changing state requires moving a record and updating the timestamps of the files touched. See [Roadmap format](roadmap-format.md).
