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

Leaving or losing a connection never makes a property choice for the absent player. Reconnecting returns the same seat and pending state. Until automatic recovery and the abandonment flow are available, a supervised pilot match can be restarted if a seat cannot resume. An abandoned match has no scored outcome.

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
