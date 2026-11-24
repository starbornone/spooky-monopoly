# Spooky Monopoly overview

[Spooky Monopoly](../README.md) is a single-player property game originally made for Weird Web October 2025. It runs in a browser and is for players who want a short, self-contained game and contributors working on its board, rules, or shared results.

## What you can do

- Choose a token, roll the dice, and decide what to do when you land on a property. The game tracks your money and properties across 20 turns and presents a summary at the end.
- Unlock additional token groups through play. Unlocks are stored in the current browser and carry across games on the same origin.
- View aggregated results across games when the app is connected to its Supabase statistics table.
- Start at `/` or follow an existing Weird Web October link to `/2025/spooky`.

The current scope is one player per game. Multiplayer, player accounts, cross-device unlocks, and in-progress save games are outside that scope. Shared statistics add aggregate results to the experience. A local game can be played from start to finish without a database.

Start with [Getting started](getting-started.md) to play a round. See [Architecture](architecture.md) for the boundary between gameplay and statistics and the [roadmap](../roadmap/roadmap.json) for proposed work.
