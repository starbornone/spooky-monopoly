import type { BoardSpace, PlayerToken } from "../data";
import { getPropertyActions } from "./getPropertyActions";
import { buySoloProperty, resolveSoloLanding } from "./soloRules";

export const turnChoices = ["buy", "pass", "continue"] as const;
export type TurnChoice = typeof turnChoices[number];

export interface RecordedTurn {
  roll: number;
  choice: TurnChoice | null;
}

export interface LedgerEntry {
  turn: number;
  space: BoardSpace;
  choice: TurnChoice;
  money: number;
  ownedProperties: readonly number[];
  alternatives: TurnChoice[];
}

interface LedgerStop {
  turn: number;
  space: BoardSpace;
  choice: TurnChoice | null;
}

export function replaySoloTurns(
  board: readonly BoardSpace[],
  token: PlayerToken,
  turns: readonly RecordedTurn[],
  change?: { turn: number; choice: TurnChoice }
): { entries: LedgerEntry[]; stop?: LedgerStop } {
  let state = { position: 0, money: token.startingMoney, ownedProperties: [] as readonly number[] };
  const entries: LedgerEntry[] = [];

  for (const [index, recorded] of turns.entries()) {
    const turn = index + 1;
    const choice = change?.turn === turn ? change.choice : recorded.choice;
    const landed = resolveSoloLanding(board, state, token.group, recorded.roll);
    const space = board[landed.position];
    const actions = getPropertyActions({
      ...token,
      isUnownedProperty: landed.unowned,
      price: space.price,
      money: landed.money
    });
    const allowed = { buy: actions.canBuy, pass: actions.canPass, continue: actions.canContinue };
    if (choice === null || !allowed[choice]) return { entries, stop: { turn, space, choice } };

    state = { ...state, position: landed.position, money: landed.money };
    if (choice === "buy") {
      const purchase = buySoloProperty(space, state, token);
      if (!purchase) return { entries, stop: { turn, space, choice } };
      state = { ...state, money: purchase.money, ownedProperties: purchase.ownedProperties };
    }

    entries.push({
      turn, space, choice, money: state.money, ownedProperties: state.ownedProperties,
      alternatives: turnChoices.filter(action => action !== choice && allowed[action])
    });
  }

  return { entries };
}
