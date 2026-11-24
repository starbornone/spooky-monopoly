# Development

Start with [Getting started](getting-started.md). Use the scripts in [`package.json`](../package.json) from the repository root.

| Command | Use |
| --- | --- |
| `pnpm install` | Install the dependencies in the pnpm lockfile. Run after dependency changes. |
| `pnpm dev` | Start Next.js in development mode. |
| `pnpm typecheck` | Generate Next.js route types and run TypeScript without emitting JavaScript. |
| `pnpm build` | Compile and type-check the production app. |
| `pnpm start` | Serve the existing production build. Run `pnpm build` first. |
| `pnpm test:routes` | Run the production page and API compatibility checks after `pnpm build`. The test starts a local server without Supabase. |
| `pnpm test` | Run statistics-state, solo rules, token-unlock, and multiplayer pilot checks. |
| `pnpm test:browser` | Exercise built gameplay at three viewport sizes. Run `pnpm exec playwright-core install chromium` once and `pnpm build` before running these checks. |

Run `pnpm typecheck` and `pnpm build` for code changes and exercise the affected path manually. Run `pnpm test:routes` after route or configuration changes. For docs-only changes, check that local links resolve and validate any changed roadmap JSON against the [format contract](roadmap-format.md).

## Verify an affected path

- **Board or token changes** — choose a token, roll, make a property choice, and finish a round. Check the results and try restarting. Verify unlock changes in a browser profile where the affected group is still locked.
- **Routes or configuration** — check both `/` and `/2025/spooky`. If API routing changes, check the current and legacy paths for each handler using the same HTTP method.
- **Statistics changes** — first check that play and restart work with no Supabase settings and that the API returns HTTP 503. Then use a configured test database to check the empty response, one finished game submission, and aggregate results. Call out cases you could not exercise in your change notes.
- **Multiplayer rules** - run `pnpm test` and review the [pilot rules](multiplayer-rules.md).

Keep gameplay logic and its styles in [`app/game/`](../app/game/). Collection and aggregation live in [`app/api/`](../app/api/). See [Architecture](architecture.md) for the entry points and responsibilities. Keep `.env.local`, `.next/`, `node_modules/`, generated Next.js types, and TypeScript build metadata out of commits. Put the names of additional required settings in `.env.example` if the app actually begins to read them.

For how to document a change and update its roadmap item, see [Contributing](contributing.md).
