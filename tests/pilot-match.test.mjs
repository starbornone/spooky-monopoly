import assert from "node:assert/strict";
import { test } from "node:test";
import { boardSpaces } from "../app/game/data/boardSpaces.ts";
import {
  activePilotSeat, createPilotMatch, executePilotIntent, resolvePilotAction
} from "../app/server/multiplayer/pilotMatch.ts";

function apply(match, seat, action, roll = 1) {
  const result = resolvePilotAction(boardSpaces, match, seat, action, () => roll);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.match;
}

function moveSeat(match, seat, position, cash) {
  return { ...match, players: match.players.map((player, index) => index === seat ? { position, cash } : player) };
}

test("buys or passes on an unowned property and keeps an unaffordable choice pending", () => {
  const start = moveSeat(createPilotMatch(0), 0, 0, 250);
  const choice = apply(start, 0, "roll", 4);
  assert.deepEqual(choice.phase, { kind: "choice", spaceId: 4 });
  assert.equal(choice.completedTurns, 0);
  assert.equal(activePilotSeat(choice), 0);
  assert.deepEqual(resolvePilotAction(boardSpaces, choice, 0, "roll"), { ok: false, code: "wrong-phase" });
  const bought = apply(choice, 0, "buy");
  assert.equal(bought.owners[4], 0);
  assert.equal(bought.players[0].cash, 130);
  assert.equal(bought.completedTurns, 1);
  assert.equal(activePilotSeat(bought), 1);
  assert.equal(choice.players[0].cash, 250);
  assert.deepEqual(choice.owners, {});

  const poor = apply(moveSeat(start, 0, 0, 60), 0, "roll", 4);
  assert.deepEqual(resolvePilotAction(boardSpaces, poor, 0, "buy"), { ok: false, code: "unaffordable" });
  const passed = apply(poor, 0, "pass");
  assert.equal(passed.players[0].cash, 60);
  assert.equal(passed.owners[4], undefined);
  assert.equal(activePilotSeat(passed), 1);
});

test("transfers rent up to available cash without eliminating the visitor", () => {
  const match = { ...moveSeat(createPilotMatch(0), 0, 13, 40), owners: { 14: 1 } };
  const landed = apply(match, 0, "roll");
  assert.deepEqual(landed.players, [{ cash: 0, position: 14 }, { cash: 1040, position: 0 }]);
  assert.equal(landed.completedTurns, 1);
  assert.deepEqual(landed.phase, { kind: "roll" });

  for (const next of [
    apply({ ...match, owners: { 14: 0 } }, 0, "roll"),
    apply(match, 0, "roll", 2)
  ]) {
    assert.equal(next.players[0].cash, 40);
    assert.equal(next.players[1].cash, 1000);
  }
});

test("awards GO once and applies it before rent", () => {
  const start = moveSeat(createPilotMatch(0), 0, boardSpaces.length - 1, 0);
  assert.equal(apply(start, 0, "roll").players[0].cash, 100);
  const landed = apply({ ...start, owners: { 1: 1 } }, 0, "roll", 2);
  assert.deepEqual(landed.players, [{ cash: 88, position: 1 }, { cash: 1012, position: 0 }]);
  const station = apply(moveSeat(start, 0, 7, 0), 0, "roll");
  assert.equal(station.players[0].cash, 100);
  const leavingGo = apply(moveSeat(start, 0, 0, 0), 0, "roll");
  assert.equal(leavingGo.players[0].cash, 0);
});

test("alternates seats for ten full rounds, scores ties, and ends after a last-turn purchase", () => {
  const firstSeat = 1;
  let match = createPilotMatch(firstSeat);
  const turns = [0, 0];
  for (let index = 0; index < 20; index++) {
    const active = activePilotSeat(match);
    assert.equal(active, index % 2 === 0 ? 1 : 0);
    turns[active]++;
    match = apply(match, active, "roll", 1);
    if (match.phase.kind === "choice") match = apply(match, active, "pass");
  }
  assert.deepEqual(turns, [10, 10]);
  assert.equal(activePilotSeat(match), null);
  assert.deepEqual(match.phase, { kind: "finished", scores: [1100, 1100], winner: null });
  assert.deepEqual(resolvePilotAction(boardSpaces, match, 1, "roll"), { ok: false, code: "finished" });

  const final = { ...createPilotMatch(0), completedTurns: 19 };
  const choice = apply(final, 1, "roll", 4);
  assert.equal(choice.phase.kind, "choice");
  const scored = apply(choice, 1, "buy");
  assert.equal(scored.owners[4], 1);
  assert.equal(scored.players[1].cash, 880);
  assert.deepEqual(scored.phase, { kind: "finished", scores: [1000, 1000], winner: null });
});

function makeStore() {
  const matches = new Map([["room-a", createPilotMatch(0)], ["room-b", createPilotMatch(1)]]);
  const receipts = new Map();
  const key = (roomId, seat, actionId) => JSON.stringify([roomId, seat, actionId]);
  return {
    readMatch: async roomId => matches.get(roomId) ?? null,
    readReceipt: async (roomId, seat, actionId) => receipts.get(key(roomId, seat, actionId)) ?? null,
    commit: async (roomId, seat, revision, receipt) => {
      const receiptKey = key(roomId, seat, receipt.intent.actionId);
      if (matches.get(roomId)?.revision !== revision || receipts.has(receiptKey)) return false;
      matches.set(roomId, receipt.match);
      receipts.set(receiptKey, receipt);
      return true;
    }
  };
}

test("accepts a server-resolved roll and rejects malformed, wrong-seat, and stale commands", async () => {
  const store = makeStore();
  const member = { roomId: "room-a", seat: 0 };
  const send = (payload, actor = member) => executePilotIntent(store, boardSpaces, actor, payload, () => 4);
  const intent = { actionId: "roll-1", expectedRevision: 0, action: "roll" };
  assert.deepEqual(await send(null), { ok: false, code: "invalid-intent" });
  assert.deepEqual(await send({ ...intent, expectedRevision: -1 }), { ok: false, code: "invalid-intent" });
  assert.deepEqual(await send(intent, { roomId: "room-b", seat: 0 }), { ok: false, code: "wrong-seat" });
  assert.deepEqual(await send(intent, { roomId: "missing", seat: 0 }), { ok: false, code: "room-not-found" });

  const accepted = await send({ ...intent, roll: 6, seat: 1 });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.match.lastRoll, 4);
  assert.equal(accepted.match.players[0].position, 4);
  assert.deepEqual(await send({ ...intent, actionId: "another-roll" }), { ok: false, code: "stale-revision" });
  assert.deepEqual(await send({ ...intent, action: "buy" }), { ok: false, code: "reused-action-id" });
  assert.equal((await store.readMatch("room-b")).revision, 0);
});

test("same-ID retries return their receipt and racing commands commit one result", async () => {
  const store = makeStore();
  const member = { roomId: "room-a", seat: 0 };
  let rolls = 0;
  const send = payload => executePilotIntent(store, boardSpaces, member, payload, () => ++rolls);
  const roll = { actionId: "roll-1", expectedRevision: 0, action: "roll" };
  const [accepted, retry] = await Promise.all([send(roll), send(roll)]);
  assert.deepEqual(accepted, retry);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.match.revision, 1);

  const buy = { actionId: "buy-1", expectedRevision: 1, action: "buy" };
  const pass = { actionId: "pass-1", expectedRevision: 1, action: "pass" };
  const results = await Promise.all([send(buy), send(pass)]);
  assert.equal(results.filter(result => result.ok).length, 1);
  assert.deepEqual(results.find(result => !result.ok), { ok: false, code: "stale-revision" });
  assert.equal((await store.readMatch("room-a")).completedTurns, 1);
  assert.deepEqual(await send(roll), accepted);
});
