import { boardSpaces } from "../app/game/data/boardSpaces.ts";
import { randomForChallengeTurn } from "../app/game/utils/challenge.ts";
import { activePilotSeat, createPilotMatch, resolvePilotAction } from "../app/server/multiplayer/pilotMatch.ts";

const seeds = 1000;
const wins = { first: 0, second: 0, ties: 0 };
let totalFirstSeatLead = 0;

function simulate(seed, firstSeat) {
  let match = createPilotMatch(firstSeat);

  while (match.phase.kind !== "finished") {
    const seat = activePilotSeat(match);
    let action = "roll";
    if (match.phase.kind === "choice") {
      const price = boardSpaces[match.players[seat].position].price;
      const reserve = seat === 0 ? 0 : 300;
      action = match.players[seat].cash - price >= reserve ? "buy" : "pass";
    }
    const random = randomForChallengeTurn(seed, match.completedTurns);
    const result = resolvePilotAction(boardSpaces, match, seat, action, () => Math.floor(random() * 6) + 1);
    if (!result.ok) throw new Error(`Pilot simulation rejected ${action}: ${result.code}`);
    match = result.match;
  }

  const { scores, winner } = match.phase;
  totalFirstSeatLead += scores[firstSeat] - scores[1 - firstSeat];
  if (winner === null) wins.ties++;
  else if (winner === firstSeat) wins.first++;
  else wins.second++;
}

for (let seed = 0; seed < seeds; seed++) {
  simulate(seed, 0);
  simulate(seed, 1);
}

console.log(JSON.stringify({
  seeds,
  matches: seeds * 2,
  ...wins,
  meanFirstSeatLead: Number((totalFirstSeatLead / (seeds * 2)).toFixed(2))
}, null, 2));
