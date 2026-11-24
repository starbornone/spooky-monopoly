import { boardSpaces, MAX_TURNS, PLAYER_TOKENS } from "../data";
import { challengeVersion, isChallengeSeed } from "./challenge";
import type { PurchaseBehavior } from "./tokenUnlocks";

export interface LocalRun {
  tokenId: string;
  challenge?: { seed: number; rules: typeof challengeVersion };
  spaceId: number;
  turnCount: number;
  money: number;
  ownedProperties: number[];
  showPopup: boolean;
  purchaseBehavior: PurchaseBehavior;
  gameLog: { id: number; message: string }[];
}

const storageKey = "spooky-local-run";
const version = 1;

function isCounter(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isLocalRun(value: unknown): value is LocalRun {
  if (!value || typeof value !== "object") return false;
  const run = value as Partial<LocalRun>;
  const behavior = run.purchaseBehavior;
  return PLAYER_TOKENS.some(token => token.id === run.tokenId) &&
    (run.challenge === undefined || (!!run.challenge && run.challenge.rules === challengeVersion && isChallengeSeed(run.challenge.seed))) &&
    boardSpaces.some(space => space.id === run.spaceId) &&
    isCounter(run.turnCount) && run.turnCount <= MAX_TURNS &&
    isCounter(run.money) &&
    Array.isArray(run.ownedProperties) &&
    new Set(run.ownedProperties).size === run.ownedProperties.length &&
    run.ownedProperties.every(id => boardSpaces.some(space => space.id === id && space.type === "property")) &&
    typeof run.showPopup === "boolean" && (run.turnCount > 0 || !run.showPopup) &&
    !!behavior &&
    isCounter(behavior.totalPropertiesLandedOn) && behavior.totalPropertiesLandedOn <= run.turnCount &&
    isCounter(behavior.totalAffordablePropertiesLandedOn) &&
    behavior.totalAffordablePropertiesLandedOn <= behavior.totalPropertiesLandedOn &&
    isCounter(behavior.totalPropertiesBought) && behavior.totalPropertiesBought === run.ownedProperties.length &&
    behavior.totalPropertiesBought <= behavior.totalAffordablePropertiesLandedOn &&
    Array.isArray(run.gameLog) && run.gameLog.length <= MAX_TURNS * 10 &&
    run.gameLog.every(entry => entry && isCounter(entry.id) && typeof entry.message === "string");
}

export function readLocalRun(): LocalRun | null {
  try {
    const stored = localStorage.getItem(storageKey);
    const data = stored ? JSON.parse(stored) : null;
    return data?.version === version && isLocalRun(data.run) ? data.run : null;
  } catch {
    return null;
  }
}

export function writeLocalRun(run: LocalRun): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ version, run }));
  } catch {
    return;
  }
}

export function clearLocalRun(): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    return;
  }
}
