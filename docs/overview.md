# Spooky Monopoly overview

[Spooky Monopoly](../README.md) is a browser property game originally made for Weird Web October 2025. It includes solo play and an opt-in [private two-player pilot](multiplayer-rules.md#run-the-private-pilot).

## What you can do

- Choose a character portrait to mark your position on the solo board. Roll the dice and decide what to do when you land on a property. After 20 turns, the game summarises your cash and properties.
- Unlock additional token groups through play. The picker shows each faction's rules once you can select it. Unlocks are stored in the current browser and carry across games on the same origin.
- Resume a solo game in the same browser, or share a seeded challenge after playing.
- View aggregated results across games when the app is connected to its Supabase statistics table.
- Start at `/` or follow an existing Weird Web October link to `/2025/spooky`.

A solo game can be played from start to finish without a database. The pilot uses invite links and browser-scoped seats, with its state stored separately from solo statistics. Player accounts and cross-device unlocks are still outside the scope.

Start with [Getting started](getting-started.md) to play a round. See [Architecture](architecture.md) for the boundary between gameplay and statistics and the [roadmap](../roadmap/roadmap.json) for proposed work.
