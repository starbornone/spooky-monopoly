import assert from "node:assert/strict";

async function requestJson(origin, path, options) {
  const response = await fetch(new URL(path, origin), {
    ...options,
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  assert.ok(response.ok, `${path} returned HTTP ${response.status}`);
  const body = await response.json();
  assert.equal(body.success, true, `${path} did not confirm success`);
  return body.data;
}

async function checkSharedStats([address, ...extra]) {
  if (!address || extra.length) {
    throw new Error("Usage: node scripts/check-shared-stats.mjs <test-app-origin>");
  }
  const origin = new URL(address);
  if (!["http:", "https:"].includes(origin.protocol) || origin.href !== `${origin.origin}/`) {
    throw new Error("Supply the HTTP or HTTPS origin of the test app.");
  }

  const statsPaths = ["/api/stats", "/2025/spooky/api/stats"];
  const readStats = () => Promise.all(statsPaths.map(path => requestJson(origin, path)));
  const before = await readStats();
  const emptyGroup = {
    totalGames: 0,
    avgMoney: 0,
    avgTotalValue: 0,
    avgPropertiesOwned: 0,
    achievementCounts: {},
    titleCounts: {},
  };
  const emptyStats = {
    ...emptyGroup,
    groupCounts: {},
    groupStats: { humans: emptyGroup, elves: emptyGroup, vampires: emptyGroup },
  };
  for (const [index, stats] of before.entries()) {
    assert.equal(stats?.totalGames, 0, `${statsPaths[index]} must report an empty test table before submission`);
    assert.deepEqual(stats, emptyStats, `${statsPaths[index]} empty aggregate`);
  }

  // A Human run that buys only Pumpkin Exploitation Plaza.
  const result = {
    money: 1249,
    properties_owned: 1,
    total_revenue: 12,
    total_property_value: 60,
    achievements: [],
    player_title: "👻 Amateur Culture Vulture 👻",
    player_group: "humans",
  };
  await requestJson(origin, "/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  });

  const human = {
    ...emptyGroup,
    totalGames: 1,
    avgMoney: result.money,
    avgTotalValue: result.money + result.total_property_value,
    avgPropertiesOwned: result.properties_owned,
    titleCounts: { [result.player_title]: 1 },
  };
  const populatedStats = {
    ...human,
    groupCounts: { humans: 1 },
    groupStats: { ...emptyStats.groupStats, humans: human },
  };
  for (const [index, stats] of (await readStats()).entries()) {
    assert.deepEqual(stats, populatedStats, `${statsPaths[index]} aggregate after submission`);
  }
  console.log("Verified one shared result and its Human totals on both statistics URLs.");
}

try {
  await checkSharedStats(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
