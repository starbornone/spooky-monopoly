# Two-seat multiplayer pilot rules

This is the rules contract for the first private multiplayer pilot. Use the existing board, property prices, and posted rents with the multiplayer rules below. The pilot's balance assumptions still require playtesting.

## Match setup

- Exactly two seats. Both players use the Human rules and start at GO with $1,000 and no properties.
- Assign the first seat randomly on the server when both players are ready. The first seat stays fixed for the match. Alternate seats and give each player one turn per round.
- Play 10 complete rounds, giving both seats exactly 10 turns. A match finishes when the second seat completes the last turn.
- A guest joins by invitation. An occupied seat has its own credential for reconnection.

## Resolve a turn

1. The active seat requests a roll. Resolve one six-sided die on the server. Move clockwise and pay a $100 GO bonus once if the roll passes or lands on GO. Moving away from GO earns nothing. Landing on Cultural Imperialism Station grants $100. The two Capitalism spaces have no balance effect in the Human pilot.
2. On an unowned property, offer **Buy** at the posted price if affordable and **Pass**. Buying deducts the price and transfers ownership in one update. Passing leaves the property unowned. If the player cannot afford the property, **Pass** is the available choice. Dismissing the property details keeps that choice pending.
3. On another player's property, transfer the posted rent up to the visitor's available cash. The owner receives exactly what the visitor pays. There is no rent debt and zero cash does not eliminate the visitor. Passing a property or landing on your own property has no rent effect.
4. A completed property choice or an automatic landing advances the turn. The server remains authoritative for the active seat, roll, cash, ownership, and result. Reject an action from the wrong seat or an old revision. A retry of an accepted action returns the same outcome.

## Finish and score

Score each player by cash plus the total posted purchase value of the properties they own. Equal scores are a shared result. The pilot has no trades, auctions, mortgages, or elimination. Keep its results separate from solo global statistics.

After a match finishes, either seat can copy the same recap text or download it as a PNG. It includes the winner or tie, seat display names, final scores, cash, properties owned, and rounds played. Recaps omit the room ID, invitation, and seat credentials. The export happens in the browser. For playtest measurement, tally finished matches and how many had at least one successful export, counting each match once.

Leaving or losing a connection never makes a property choice for the absent player. Reconnecting returns the same seat, committed board, and pending decision. After a failed turn request the page refreshes from the server before allowing another action. If the server had already accepted the turn, the recovered board reflects it.

A seat is shown as away after 15 seconds without recorded activity. The remaining player can end an abandoned match after a further 60 seconds. The server checks the grace period when the player selects **End abandoned match**. A player can also confirm **Leave match** to close it immediately. In either case the game keeps the last committed board and records no score or winner.

## Examples for tests and playtesting

| Situation | Expected outcome |
| --- | --- |
| A has $250 and buys an unowned $120 property. | A now has $130 and owns the property. The turn advances once. |
| A has $40 and lands on B's property with $90 posted rent. | A ends with $0. B receives $40. A stays in the match and owes no later payment. |
| A has $60 and lands on an unowned $120 property. | A can pass. Closing the details view does not advance the turn. |
| A crosses GO and lands on an opponent's property. | Apply the $100 GO bonus before determining the amount of rent A can pay. |
| A has $370 and $130 of property value. B has $410 and $90 of property value. | Both score $500 and share the result. |
| The second seat buys a property on its tenth turn. | Record the purchase first, then finalise both scores. No eleventh turn begins. |

For the fairness pilot, play paired matches with the same recorded die sequence and swap which player goes first. Record scores, property ownership by round, rent transfers, turns at zero cash, and where each player felt the result was decided. Look for an advantage that persists after swapping seats before adjusting posted rent or round count.

## Executable checks

Run `pnpm test` for the match rules and command tests. Run `pnpm check:pilot-balance` to repeat the seeded balance simulation. The simulation plays each of 1,000 roll sequences twice with the starting seat swapped. One policy buys whenever the player can afford a property. The other leaves at least $300 after a purchase.

With these policies, the first seat won 1,114 of 2,000 matches (55.7%), the second seat won 870 (43.5%), and 16 were ties. The first seat averaged 29.16 more points. Use this as a baseline for human playtesting. Keep the random first seat and current prices until the pilot shows how people actually play.

## Server integration

The [pilot engine](../app/server/multiplayer/pilotMatch.ts) accepts a revision, action ID, and intent. The room handler must resolve the room and seat from a verified membership before it calls the engine. The server rolls the die. Values such as roll, price, and ownership are derived inside the game logic.

The SQLite store compares the expected revision and saves the new state and receipt together in one transaction. Receipts are keyed by room, seat, and action ID. Identical retries return the original receipt. Browsers only apply poll snapshots whose revision is at least as recent as their current view. The HTTP tests complete a match from two seats and force a receipt insertion failure to check that the match rolls back.

## Run the private pilot

Use Node.js 22.13 or later and a single host with persistent local storage. Set these variables in `.env.local` or the server's runtime environment.

| Variable | Example |
| --- | --- |
| `SPOOKY_PILOT_DB_PATH` | An absolute path to a SQLite file in a private directory writable by the server. Keep the file and its sidecar files outside the repository. |
| `SPOOKY_PILOT_ORIGIN` | `http://localhost:3000` for local testing. Use the exact HTTPS origin for remote access, without a trailing slash. |

Start the app and choose **Play with a friend**. Create a room, then copy its invite link before leaving the page. In a second browser profile, open the link and join as guest. Each player can enter a display name and select **Ready**. Both seats then see rolls, cash, positions, and property choices. Reopen the room in the same browser profile to use the existing seat. Clearing site cookies or closing a private browser session can remove access to that seat.

The pilot runs on one host with a local database file. Keep the instance restricted to your testers. The pilot is disabled when its settings are absent and solo play stays available.

The room URL carries the room ID. The invite is in the fragment until the guest joins, and the server accepts it only once. The browser sends its seat credential as a room-scoped HTTP-only cookie. The database stores credential hashes. The page polls every 1.5 seconds and refreshes when it becomes visible again. A local Chromium test refreshes a guest seat after a roll, finishes the match across two profiles, and checks that the 95th percentile time for observing a turn is below three seconds.

The board uses numbered seat markers to show where both players are and who owns each property. Select a square to inspect its full name, price, and rent. Closing those details leaves any pending buy or pass decision intact. The turn controls stay at the bottom on small screens.

Existing pilot database files gain the presence fields when the server next opens them. Existing seat credentials and turns are preserved.
