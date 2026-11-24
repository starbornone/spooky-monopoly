import { randomInt } from "node:crypto";
import type { BoardSpace } from "../../game/data";

export type PilotSeat = 0 | 1;
type PilotAction = "roll" | "buy" | "pass";
type ActionError = "wrong-seat" | "wrong-phase" | "unaffordable" | "finished";

interface PlayerState {
  position: number;
  cash: number;
}

type MatchPhase =
  | { kind: "roll" }
  | { kind: "choice"; spaceId: number }
  | { kind: "finished"; scores: readonly [number, number]; winner: PilotSeat | null };

export interface PilotMatch {
  revision: number;
  firstSeat: PilotSeat;
  completedTurns: number;
  players: readonly [PlayerState, PlayerState];
  owners: Readonly<Partial<Record<number, PilotSeat>>>;
  phase: MatchPhase;
  lastRoll: number | null;
}

const rounds = 10;
const otherSeat = (seat: PilotSeat): PilotSeat => seat === 0 ? 1 : 0;

export function createPilotMatch(firstSeat = randomInt(2) as PilotSeat): PilotMatch {
  return {
    revision: 0,
    firstSeat,
    completedTurns: 0,
    players: [{ position: 0, cash: 1000 }, { position: 0, cash: 1000 }],
    owners: {},
    phase: { kind: "roll" },
    lastRoll: null
  };
}

export function activePilotSeat(match: PilotMatch): PilotSeat | null {
  if (match.phase.kind === "finished") return null;
  return match.completedTurns % 2 === 0 ? match.firstSeat : otherSeat(match.firstSeat);
}

function finishTurn(board: readonly BoardSpace[], match: PilotMatch): PilotMatch {
  const completedTurns = match.completedTurns + 1;
  if (completedTurns < rounds * 2) {
    return { ...match, completedTurns, phase: { kind: "roll" } };
  }

  const scores: [number, number] = [match.players[0].cash, match.players[1].cash];
  for (const space of board) {
    const owner = match.owners[space.id];
    if (owner !== undefined && space.type === "property") scores[owner] += space.price ?? 0;
  }
  const winner = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
  return { ...match, completedTurns, phase: { kind: "finished", scores, winner } };
}

export function resolvePilotAction(
  board: readonly BoardSpace[],
  match: PilotMatch,
  seat: PilotSeat,
  action: PilotAction,
  rollDie: () => number = () => randomInt(1, 7)
): { ok: true; match: PilotMatch } | { ok: false; code: ActionError } {
  if (match.phase.kind === "finished") return { ok: false, code: "finished" };
  if (seat !== activePilotSeat(match)) return { ok: false, code: "wrong-seat" };
  if ((action === "roll") !== (match.phase.kind === "roll")) return { ok: false, code: "wrong-phase" };

  const players: [PlayerState, PlayerState] = [{ ...match.players[0] }, { ...match.players[1] }];
  const player = players[seat];
  const next = { ...match, players, revision: match.revision + 1 };

  if (match.phase.kind === "choice") {
    if (action === "pass") return { ok: true, match: finishTurn(board, next) };

    const space = board[player.position];
    if (space?.id !== match.phase.spaceId || space.type !== "property" ||
      space.price === undefined || match.owners[space.id] !== undefined) {
      return { ok: false, code: "wrong-phase" };
    }
    if (player.cash < space.price) return { ok: false, code: "unaffordable" };

    player.cash -= space.price;
    return {
      ok: true,
      match: finishTurn(board, { ...next, owners: { ...match.owners, [space.id]: seat } })
    };
  }

  const roll = rollDie();
  if (!Number.isInteger(roll) || roll < 1 || roll > 6) throw new RangeError("A pilot die must roll from 1 to 6");
  const destination = player.position + roll;
  player.position = destination % board.length;
  if (destination >= board.length) player.cash += 100;
  const space = board[player.position];
  if (space.id === 8) player.cash += 100;

  if (space.type === "property") {
    const owner = match.owners[space.id];
    if (owner === undefined) {
      return { ok: true, match: { ...next, lastRoll: roll, phase: { kind: "choice", spaceId: space.id } } };
    }
    if (owner !== seat) {
      const rent = Math.min(player.cash, space.rent ?? 0);
      player.cash -= rent;
      players[owner].cash += rent;
    }
  }

  return { ok: true, match: finishTurn(board, { ...next, lastRoll: roll }) };
}

interface PilotIntent {
  actionId: string;
  expectedRevision: number;
  action: PilotAction;
}

interface PilotReceipt {
  intent: PilotIntent;
  match: PilotMatch;
}

export interface PilotMatchStore {
  readMatch(roomId: string): Promise<PilotMatch | null>;
  readReceipt(roomId: string, seat: PilotSeat, actionId: string): Promise<PilotReceipt | null>;
  commit(roomId: string, seat: PilotSeat, expectedRevision: number, receipt: PilotReceipt): Promise<boolean>;
}

function readIntent(value: unknown): PilotIntent | null {
  if (typeof value !== "object" || value === null) return null;
  const { actionId, expectedRevision, action } = value as Record<string, unknown>;
  if (typeof actionId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(actionId) ||
    typeof expectedRevision !== "number" || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0 ||
    (action !== "roll" && action !== "buy" && action !== "pass")) return null;
  return { actionId, expectedRevision, action };
}

type CommandError = ActionError | "invalid-intent" | "room-not-found" | "stale-revision" | "reused-action-id";
type PilotCommandResult =
  | { ok: true; match: PilotMatch }
  | { ok: false; code: CommandError };

function replayReceipt(receipt: PilotReceipt, intent: PilotIntent): PilotCommandResult {
  if (receipt.intent.action !== intent.action || receipt.intent.expectedRevision !== intent.expectedRevision) {
    return { ok: false, code: "reused-action-id" };
  }
  return { ok: true, match: receipt.match };
}

export async function executePilotIntent(
  store: PilotMatchStore,
  board: readonly BoardSpace[],
  member: { roomId: string; seat: PilotSeat },
  payload: unknown,
  rollDie?: () => number
): Promise<PilotCommandResult> {
  const intent = readIntent(payload);
  if (!intent) return { ok: false, code: "invalid-intent" };
  const { roomId, seat } = member;
  const readReceipt = () => store.readReceipt(roomId, seat, intent.actionId);
  const prior = await readReceipt();
  if (prior) return replayReceipt(prior, intent);

  const match = await store.readMatch(roomId);
  if (!match) return { ok: false, code: "room-not-found" };
  if (match.revision !== intent.expectedRevision) {
    const accepted = await readReceipt();
    return accepted ? replayReceipt(accepted, intent) : { ok: false, code: "stale-revision" };
  }
  const result = resolvePilotAction(board, match, seat, intent.action, rollDie);
  if (!result.ok) return result;

  if (await store.commit(roomId, seat, intent.expectedRevision, { intent, match: result.match })) return result;

  const accepted = await readReceipt();
  return accepted ? replayReceipt(accepted, intent) : { ok: false, code: "stale-revision" };
}
