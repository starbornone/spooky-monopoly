import assert from "node:assert/strict";
import { test } from "node:test";
import { boardSpaces } from "../app/game/data/boardSpaces.ts";
import { PLAYER_TOKENS } from "../app/game/data/config.ts";
import { formatChallenge, randomForChallengeTurn, readChallenge } from "../app/game/utils/challenge.ts";
import { buySoloProperty, chooseSoloRoll, resolveSoloLanding } from "../app/game/utils/soloRules.ts";

const tokenIds = PLAYER_TOKENS.map(token => token.id);

test("challenge codes identify the exact token, rules version, and unsigned seed", () => {
  assert.deepEqual(readChallenge(formatChallenge("human", 0xffffffff), tokenIds),
    { status: "ready", tokenId: "human", seed: 0xffffffff });
  assert.deepEqual(readChallenge("v2.human.00000000", tokenIds), { status: "unsupported" });
  assert.deepEqual(readChallenge("v1.unknown.00000000", tokenIds), { status: "invalid" });
  assert.deepEqual(readChallenge("v1.human.00", tokenIds), { status: "invalid" });
});

test("turns reproduce independently from the same seed and turn number", () => {
  const current = randomForChallengeTurn(1837, 3);
  const restored = randomForChallengeTurn(1837, 3);
  const next = randomForChallengeTurn(1837, 4);
  const draws = Array.from({ length: 3 }, () => current());
  assert.deepEqual(draws, Array.from({ length: 3 }, () => restored()));
  assert.notDeepEqual(draws, Array.from({ length: 3 }, () => next()));
  assert.notDeepEqual(draws, Array.from({ length: 3 }, randomForChallengeTurn(1838, 3)));
});

test("solo turn rules preserve owned-property rent, wrapping bonuses, and faction effects", () => {
  const initial = { position: 15, money: 1000, ownedProperties: [1] };
  assert.equal(resolveSoloLanding(boardSpaces, initial, "humans", 1).money, 1200);
  assert.equal(resolveSoloLanding(boardSpaces, initial, "humans", 2).money, 1109);
  const roll = chooseSoloRoll(boardSpaces, 0, [], "vampires", () => 0);
  assert.equal(roll, 1);
  assert.equal(resolveSoloLanding(boardSpaces, { ...initial, position: 0, ownedProperties: [] }, "vampires", roll).money, 1025);
  assert.equal(resolveSoloLanding(boardSpaces, { position: 0, money: 2, ownedProperties: [] }, "elves", 1).money, 0);
  const elf = PLAYER_TOKENS.find(token => token.id === "elf");
  const vampire = PLAYER_TOKENS.find(token => token.id === "vampire");
  const beforePurchase = { position: 1, money: 60, ownedProperties: [] };
  assert.equal(buySoloProperty(boardSpaces[1], beforePurchase, elf), null);
  assert.equal(buySoloProperty(boardSpaces[1], { ...beforePurchase, money: 59 }, vampire), null);
  assert.equal(buySoloProperty(boardSpaces[1], beforePurchase, vampire).money, 12);
});
