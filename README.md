# Spooky Monopoly

A browser property game originally made for Weird Web October 2025, built with the Next.js App Router and TypeScript. The solo game works on its own, with an optional two-player private pilot.

## Run locally

Use Node.js 22 or later and pnpm 12.

```sh
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Existing links to `/2025/spooky` and its statistics endpoints also work.

Run `pnpm typecheck` for TypeScript checks and `pnpm build` to create a production build. Run `pnpm start` to serve that build.

## Global statistics

The game and local token unlocks work without Supabase. To enable shared statistics, copy `.env.example` to `.env.local` and set `NEXT_HALLOWOPOLY_SUPABASE_PROJECT_ID` to the project reference and `NEXT_HALLOWOPOLY_SUPABASE_KEY` to its publishable or legacy anon key.

The API uses the existing `wwo_2025_spooky_game_stats` table. The Supabase project's policies must allow the configured public key to read and insert game results.

## Private multiplayer pilot

To play with a friend, follow the [pilot setup](docs/multiplayer-rules.md#run-the-private-pilot). It runs on a single host and saves matches in a local SQLite file.

## Documentation

- [Project overview](docs/overview.md) for gameplay, setup, and architecture.
- [Agent instructions](AGENTS.md) for repository conventions and checks.
- [Roadmap](roadmap/roadmap.json) for upcoming work in priority order.
