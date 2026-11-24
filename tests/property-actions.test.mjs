import assert from "node:assert/strict";
import { test } from "node:test";
import { getPropertyActions } from "../app/game/utils/getPropertyActions.ts";

test("derives legal actions for human, vampire, elf and passive landings", () => {
  const property = {
    isUnownedProperty: true,
    price: 100,
    money: 100,
    canBuyProperties: true,
    canResistBuyingProperties: true
  };
  assert.deepEqual(getPropertyActions(property), { canBuy: true, canPass: true, canContinue: false });
  assert.deepEqual(getPropertyActions({ ...property, canResistBuyingProperties: false }),
    { canBuy: true, canPass: false, canContinue: false });
  assert.deepEqual(getPropertyActions({ ...property, canResistBuyingProperties: false, money: 99 }),
    { canBuy: false, canPass: false, canContinue: true });
  assert.deepEqual(getPropertyActions({ ...property, canBuyProperties: false }),
    { canBuy: false, canPass: true, canContinue: false });
  assert.deepEqual(getPropertyActions({ ...property, isUnownedProperty: false }),
    { canBuy: false, canPass: false, canContinue: true });
});
