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
