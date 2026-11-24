import { createInterface } from "node:readline";

import { boardSpaces } from "../app/game/data/boardSpaces.ts";
import { isChallengeSeed, randomForChallengeTurn } from "../app/game/utils/challenge.ts";
import { activePilotSeat, createPilotMatch, resolvePilotAction } from "../app/server/multiplayer/pilotMatch.ts";

const players = ["A", "B"];

function applyAction(match, seat, action, rollDie) {
  const result = resolvePilotAction(boardSpaces, match, seat, action, rollDie);
  if (!result.ok) throw new Error(`The pilot engine rejected ${action} (${result.code}).`);
  return result.match;
}

async function chooseProperty(ask, player, space, cash) {
  const canBuy = cash >= space.price;
  const options = canBuy ? `buy for $${space.price} (rent $${space.rent ?? 0}) or pass` : `pass (price $${space.price})`;
  for (;;) {
    const action = (await ask(`${player} has $${cash}. Enter ${options}.`)).toLowerCase();
    if (action === "pass" || (canBuy && action === "buy")) return action;
  }
}

async function playMatch(ask, seed, firstSeat) {
  let match = createPilotMatch(firstSeat);
  const turns = [];
  const ownershipByRound = [];
  console.error(`Player ${players[firstSeat]} goes first.`);

  while (match.phase.kind !== "finished") {
    const previous = match;
    const seat = activePilotSeat(previous);
    const player = players[seat];
    const round = Math.floor(previous.completedTurns / players.length) + 1;
    await ask(`Round ${round}. Player ${player}, press Enter to roll.`);
    const roll = Math.floor(randomForChallengeTurn(seed, previous.completedTurns)() * 6) + 1;
    match = applyAction(previous, seat, "roll", () => roll);
    const space = boardSpaces[match.players[seat].position];
    console.error(`${player} rolled ${roll} and landed on ${space.name}.`);

    let choice = null;
    if (match.phase.kind === "choice") {
      choice = await chooseProperty(ask, player, space, match.players[seat].cash);
      match = applyAction(match, seat, choice);
    }

    const owner = previous.owners[space.id];
    const rent = owner !== undefined && owner !== seat
      ? match.players[owner].cash - previous.players[owner].cash
      : 0;
    const cash = match.players[seat].cash;
    if (rent > 0) console.error(`${player} paid $${rent} rent to ${players[owner]}.`);
    console.error(`${player} ends the turn with $${cash}.`);
    turns.push({
      round, player, roll, space: space.name, choice, cash,
      rent: rent > 0 ? { to: players[owner], amount: rent } : null,
    });

    if (match.completedTurns % players.length === 0) {
      const holdings = players.map((name, index) => ({
        player: name,
        properties: boardSpaces.filter(space => match.owners[space.id] === index).map(space => space.name),
      }));
      ownershipByRound.push({ round, holdings });
    }
  }

  const scores = players.map((player, index) => ({
    player,
    score: match.phase.scores[index],
    turnsAtZeroCash: turns.filter(turn => turn.player === player && turn.cash === 0).length,
  }));
  console.error(scores.map(({ player, score }) => `${player} scored $${score}.`).join(" "));
  const feedback = [];
  for (const player of players) {
    const turningPoint = await ask(`Player ${player}, when did the outcome feel decided? Press Enter to skip.`);
    feedback.push({ player, turningPoint });
  }

  return {
    firstPlayer: players[firstSeat],
    winner: match.phase.winner === null ? null : players[match.phase.winner],
    scores,
    turns,
    ownershipByRound,
    feedback,
  };
}

async function main([value, ...extra]) {
  const seed = Number(value);
  if (!/^\d+$/.test(value ?? "") || !isChallengeSeed(seed) || extra.length) {
    throw new Error("Supply one seed from 0 to 4294967295.");
  }

  const input = createInterface({ input: process.stdin });
  const lines = input[Symbol.asyncIterator]();
  const ask = async prompt => {
    console.error(prompt);
    const line = await lines.next();
    if (line.done) throw new Error("Input ended before the paired matches were complete.");
    return line.value.trim();
  };

  try {
    const firstSeat = seed % players.length;
    const first = await playMatch(ask, seed, firstSeat);
    const second = await playMatch(ask, seed, 1 - firstSeat);
    console.log(JSON.stringify({ seed, matches: [first, second] }, null, 2));
  } finally {
    input.close();
  }
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
