# Getting started

You need Node.js 22 or later, pnpm 12, a web browser, and package registry access for the initial install. Run these commands from the repository root.

```sh
node --version
pnpm --version
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) or the address printed by the dev server if it uses a different port. The first success check is the **Choose Your Token** dialog. Pick a human token and roll the dice. Resolve the landing prompt to make the next turn available. After 20 turns, select **End Game** to view your results and restart. To try an unlock, finish a round in which you land on at least one property and buy none, then check that elf tokens are available after restarting in the same browser.

## Resume a game

The game saves your progress in this browser after each completed action. If you reload during a property choice, select **Resume** to return to that choice with the same balance. **Start new** discards the saved game and opens token selection. Use the same browser profile and site address to resume. If storage is unavailable or the save cannot be read, you can still start a new game.

## Share a result

At the end of a game, use **Copy result text** for chat or **Download result image** to save a PNG. The result includes your title, faction, cash, property count and value, and achievements. Both options work with shared statistics disabled. If the browser blocks clipboard access, the game displays text you can select and copy.

## Play a seeded challenge

Check **Create a shareable challenge** before choosing a token. At the end of the run, copy the challenge link. Anyone who opens it can choose **Play challenge** to start with the same token and rules, even if they have yet to unlock that faction. The link contains the seed and rules version. The same choices produce the same result. Different purchases can affect later vampire rolls because their targeting depends on which properties remain unowned.

Opening a link does not replace a local save until you start the challenge. If you resume an interrupted challenge, it uses the same seed and picks up at the saved turn.

## Try an alternate choice with Ghost Ledger

After a run with a property choice you could have made differently, open **Alternate property choice** in Ghost Ledger. Choose a turn to compare the original and alternate cash and property ownership after every turn. The replay uses the recorded dice rolls and your original later choices. If one of those choices becomes impossible, the ledger identifies that turn and stops the alternate run. Your saved unlocks and official result stay the same.

Runs started before turn recording can still be resumed. Ghost Ledger is available for new runs with a complete history and a legal alternate choice.

## Enable shared statistics

For shared results, make a copy of [`.env.example`](../.env.example) named `.env.local` in the repository root and fill in both values.

| Setting | Value |
| --- | --- |
| `NEXT_HALLOWOPOLY_SUPABASE_PROJECT_ID` | Supabase project reference. |
| `NEXT_HALLOWOPOLY_SUPABASE_KEY` | Supabase publishable or legacy anon key. |

Use a Supabase project with the Data API enabled. If it needs a new `wwo_2025_spooky_game_stats` table, run [setup-shared-stats.sql](../scripts/setup-shared-stats.sql) once in the SQL Editor. It creates the table and lets the `anon` role submit results and read the columns used in the aggregates. For an existing table, check that it meets the same contract before connecting the app.

Restart the dev server after editing `.env.local`. Check `/api/stats` for a JSON response with `success: true`, then finish a round in the intended test environment to check submission. An empty table returns zero games.

The statistics panel refreshes after the server confirms a submission. If the submission fails, you can still view and share your local result and start another game.

### Verify a test project

Point the app at a dedicated test Supabase project with an empty statistics table and use its publishable or legacy anon key. Check the table constraints and the public role's grants and row-level security policies in the Supabase dashboard. Then run this command against the running app.

```sh
node scripts/check-shared-stats.mjs http://localhost:3000
```

The command checks that both statistics URLs report zero games, submits one fixture result, and checks the overall and Human totals. The fixture row stays in the test table. Use an empty test table for each run.

## First-run problems

| Symptom | Check |
| --- | --- |
| `node` or `pnpm` is missing, or installation reports an engine mismatch | Confirm the prerequisite versions in the same shell you use to run the app. |
| The install reports DNS, registry, or package download errors | Verify package registry access. Gameplay can run without Supabase once dependencies are available. |
| The browser cannot reach the game | Confirm `pnpm dev` is still running and open the address it prints. |
| The sidebar says shared statistics are not configured | The game is playable. Set both Supabase values to enable shared results. |
| The sidebar says **Unable to load shared statistics** | Retry first. If the error persists, check the Supabase project reference, key, table, read policy, and handler logs. A successful request with zero games shows an empty state. |
| Tokens you earned are locked again | Use the same browser profile and origin. Clearing site data removes saved unlocks. |

The supported local workflow uses Node.js. Static-only hosting cannot run the statistics handlers. See [Development](development.md) for a production build and [Architecture](architecture.md) for the URLs to check.
