import assert from "node:assert/strict";
import { test } from "node:test";
import { getUnlockStatus, isTokenUnlocked, recordEarnedUnlocks } from "../app/game/utils/tokenUnlocks.ts";

test("qualifying results unlock new factions and persist across reads", () => {
  const values = new Map();
  Object.defineProperty(globalThis, "window", { value: {} });
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: key => values.get(key),
      setItem: (key, value) => values.set(key, value)
    }
  });

  const behavior = {
    totalPropertiesLandedOn: 3,
    totalAffordablePropertiesLandedOn: 2,
    totalPropertiesBought: 2
  };
  assert.deepEqual(getUnlockStatus(), { vampires: false, elves: false });
  assert.deepEqual(recordEarnedUnlocks({ ...behavior, totalPropertiesBought: 1 }), []);
  assert.deepEqual(recordEarnedUnlocks(behavior), ["vampires"]);
  assert.deepEqual(recordEarnedUnlocks(behavior), []);
  assert.equal(isTokenUnlocked("vampires"), true);
  assert.deepEqual(recordEarnedUnlocks({ ...behavior, totalPropertiesBought: 0 }), ["elves"]);
  assert.deepEqual(getUnlockStatus(), { vampires: true, elves: true });
});
