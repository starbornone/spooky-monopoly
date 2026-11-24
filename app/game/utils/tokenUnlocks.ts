export interface UnlockStatus {
  vampires: boolean;
  elves: boolean;
}

const UNLOCK_STORAGE_KEY = "spooky-token-unlocks";

export function getUnlockStatus(): UnlockStatus {
  if (typeof window === "undefined") {
    return { vampires: false, elves: false };
  }

  try {
    const stored = localStorage.getItem(UNLOCK_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error reading unlock status:", error);
  }

  return { vampires: false, elves: false };
}

export function setUnlockStatus(unlocks: UnlockStatus): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify(unlocks));
  } catch (error) {
    console.error("Error saving unlock status:", error);
  }
}

export function unlockToken(tokenType: "vampires" | "elves"): void {
  const current = getUnlockStatus();
  current[tokenType] = true;
  setUnlockStatus(current);
}

export function isTokenUnlocked(tokenType: "vampires" | "elves"): boolean {
  return getUnlockStatus()[tokenType];
}

export interface PurchaseBehavior {
  totalPropertiesLandedOn: number;
  totalPropertiesBought: number;
  totalAffordablePropertiesLandedOn: number;
}

export const factionDetails = {
  vampires: {
    name: "Vampire",
    rule: "Buy every property you can afford.",
    unlock: "Finish a game after buying every unowned property you landed on that you could afford."
  },
  humans: { name: "Human", rule: "Buy or pass when you land on a property." },
  elves: {
    name: "Elf",
    rule: "Play without buying properties.",
    unlock: "Land on an unowned property and finish the game without buying anything."
  }
} as const;

export function recordEarnedUnlocks(behavior: PurchaseBehavior): (keyof UnlockStatus)[] {
  const current = getUnlockStatus();
  const earned: (keyof UnlockStatus)[] = [];

  if (behavior.totalPropertiesLandedOn > 0) {
    if (!current.vampires && behavior.totalAffordablePropertiesLandedOn > 0 &&
      behavior.totalPropertiesBought === behavior.totalAffordablePropertiesLandedOn) {
      earned.push("vampires");
    }
    if (!current.elves && behavior.totalPropertiesBought === 0) earned.push("elves");
  }

  for (const group of earned) current[group] = true;
  if (earned.length > 0) setUnlockStatus(current);
  return earned;
}
