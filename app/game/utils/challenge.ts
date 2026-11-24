export const challengeVersion = "v1";

export type Challenge =
  | { status: "ready"; tokenId: string; seed: number }
  | { status: "invalid" | "unsupported" };

export function readChallenge(value: string, tokenIds: readonly string[]): Challenge {
  const [version, tokenId, seed, extra] = value.split(".");
  if (extra !== undefined || !tokenId || !/^[0-9a-f]{8}$/.test(seed ?? "")) {
    return { status: "invalid" };
  }
  if (version !== challengeVersion) return { status: "unsupported" };
  if (!tokenIds.includes(tokenId)) return { status: "invalid" };
  return { status: "ready", tokenId, seed: Number.parseInt(seed, 16) };
}

export function isChallengeSeed(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
}

export function formatChallenge(tokenId: string, seed: number): string {
  return `${challengeVersion}.${tokenId}.${seed.toString(16).padStart(8, "0")}`;
}

export function randomForChallengeTurn(seed: number, turn: number): () => number {
  let state = (seed + Math.imul(turn + 1, 0x9e3779b9)) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 0x100000000;
  };
}
