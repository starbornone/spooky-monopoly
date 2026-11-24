# Getting started

You need Node.js 22 or later, pnpm 12, a web browser, and package registry access for the initial install. Run these commands from the repository root.

```sh
node --version
pnpm --version
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) or the address printed by the dev server if it uses a different port. The first success check is the **Choose Your Token** dialog. Pick a human token and roll the dice. Resolve the landing prompt to make the next turn available. After 20 turns, select **End Game** to view your results and restart. To try an unlock, finish a round in which you land on at least one property and buy none, then check that elf tokens are available after restarting in the same browser.

## Enable shared statistics

For shared results, make a copy of [`.env.example`](../.env.example) named `.env.local` in the repository root and fill in both values.

| Setting | Value |
| --- | --- |
| `NEXT_HALLOWOPOLY_SUPABASE_PROJECT_ID` | Supabase project reference. |
| `NEXT_HALLOWOPOLY_SUPABASE_KEY` | Supabase publishable or legacy anon key. |

Use an existing project with the `wwo_2025_spooky_game_stats` table and policies permitting the configured public key to select and insert game results. The repository does not provision that table. Restart the dev server after editing `.env.local`. Check `/api/stats` for a JSON response with `success: true`, then finish a round in the intended test environment to check submission. An empty table can return zero games.

## First-run problems

| Symptom | Check |
| --- | --- |
| `node` or `pnpm` is missing, or installation reports an engine mismatch | Confirm the prerequisite versions in the same shell you use to run the app. |
| The install reports DNS, registry, or package download errors | Verify package registry access. Gameplay can run without Supabase once dependencies are available. |
| The browser cannot reach the game | Confirm `pnpm dev` is still running and open the address it prints. |
| The sidebar says **Unable to load stats** | Without Supabase settings this is expected. If you configured them, check the project reference, key, table, and read policy. Check the terminal for handler errors. |
| Tokens you earned are locked again | Use the same browser profile and origin. Clearing site data removes saved unlocks. |

The supported local workflow uses Node.js. Static-only hosting cannot run the statistics handlers. See [Development](development.md) for a production build and [Architecture](architecture.md) for the URLs to check.
