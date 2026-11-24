import assert from "node:assert/strict";
import { test } from "node:test";
import { loadGlobalStats } from "../app/game/utils/loadGlobalStats.ts";

test("distinguishes unconfigured statistics, empty results, and a recoverable failure", async ({ mock }) => {
  const data = { totalGames: 2, avgTotalValue: 1200 };
  const replies = [
    Response.json({ success: false, code: "STATS_UNCONFIGURED" }, { status: 503 }),
    Response.json({ success: true, data: { totalGames: 0 } }),
    Response.json({ success: false }, { status: 500 }),
    Response.json({ success: true, data })
  ];
  mock.method(globalThis, "fetch", async () => replies.shift());

  assert.deepEqual(await loadGlobalStats(), { status: "unconfigured" });
  assert.deepEqual(await loadGlobalStats(), { status: "empty" });
  assert.deepEqual(await loadGlobalStats(), { status: "error" });
  assert.deepEqual(await loadGlobalStats(), { status: "ready", data });
});
