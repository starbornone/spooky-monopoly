# Contributing

Start with a concrete in-game outcome or a reproducible issue. Identify what changes for a player or maintainer, where it belongs in the [architecture](architecture.md), and how to verify it. For gameplay bugs, include the token group, turn, board space, and choice where relevant. For statistics issues, say whether shared statistics were configured and describe the failing step.

## Make and verify the change

1. Keep the change focused. For a gameplay change, consider which token groups it affects and whether old Weird Web October URLs still resolve.
2. Follow the [development checks](development.md) for the affected path. Record the commands and manual cases you ran in the change description.
3. Update the docs that describe changed behaviour. Keep the [README](../README.md) short and accurate as the human entry point. Use the setup guide for prerequisites and configuration, the architecture page for module ownership, and the decision log for choices with lasting consequences.
4. Update the [roadmap](../roadmap/roadmap.json) in the same change as the work it describes. Move a finished item to the end of [completed.json](../roadmap/completed.json) with `completedAt`. If work is dropped, move it to the end of [cancelled.json](../roadmap/cancelled.json) with `cancelledAt` and a short reason. Keep the id in both cases and update each modified file's timestamp.

If a proposal expands the current single-player scope or adds operational dependencies, spell out the motivation and agree on the scope before implementing it. For changes to the three roadmap files, follow the [format contract](roadmap-format.md) and [agent instructions](../AGENTS.md).
