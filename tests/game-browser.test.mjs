import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { chromium } from "playwright-core";

const origin = "http://spooky.test";
const viewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 1024, height: 768 }
];

test("seeded challenge links produce the same result in fresh browsers after a reload", { timeout: 60000 }, async t => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const code = "v1.human.12345678";
  const results = await Promise.all([false, true].map(async reload => {
    const page = await browser.newPage({ viewport: viewports[1], reducedMotion: "reduce" });
    try {
      await serveGame(page);
      await page.goto(origin + "/?challenge=" + (reload ? code : "v2.human.12345678"));
      if (!reload) {
        await page.getByText("This challenge uses an unsupported rules version.").waitFor();
        await page.goto(origin + "/?challenge=" + code);
      }
      await page.getByRole("button", { name: "Play challenge", exact: true }).click();
      for (let turn = 1; turn <= 20; turn++) {
        await page.getByRole("button", { name: /Roll Dice/ }).click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor();
        if (reload && turn === 4) {
          await page.reload();
          await page.getByRole("button", { name: "Resume", exact: true }).click();
          await dialog.waitFor();
        }
        const purchase = dialog.getByRole("button", { name: /^Buy for / });
        if (turn % 2 === 0 && await purchase.count()) await purchase.click();
        else await dialog.getByRole("button", { name: /^(Pass|Continue)$/ }).click();
      }
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("spooky-local-run")).run);
      await page.getByRole("button", { name: /End Game/ }).click();
      await page.getByRole("button", { name: "Copy challenge link" }).click();
      assert.equal(await page.getByRole("textbox", { name: "Challenge link" }).inputValue(), origin + "/?challenge=" + code);
      assert.equal(saved.turns.length, 20);
      assert.ok(saved.turns.every(turn => turn.choice !== null));
      return { money: saved.money, properties: saved.ownedProperties, space: saved.spaceId, log: saved.gameLog, turns: saved.turns };
    } finally {
      await page.close();
    }
  }));
  assert.deepEqual(results[0], results[1]);

  const creator = await browser.newPage({ viewport: viewports[1], reducedMotion: "reduce" });
  await serveGame(creator);
  await creator.goto(origin);
  await creator.getByRole("checkbox", { name: "Create a shareable challenge" }).check();
  await creator.getByRole("button", { name: "Choose Human token 1" }).click();
  await creator.waitForFunction(() => localStorage.getItem("spooky-local-run") !== null);
  const created = await creator.evaluate(() => JSON.parse(localStorage.getItem("spooky-local-run")).run);
  assert.equal(created.challenge.rules, "v1");
  assert.equal(created.tokenId, "human-woman");
  assert.ok(Number.isInteger(created.challenge.seed));
  await creator.goto(origin + "/?challenge=" + code);
  await creator.getByRole("button", { name: "Decline challenge" }).click();
  await creator.getByRole("button", { name: "Resume", exact: true }).click();
  await creator.getByRole("button", { name: /Roll Dice/ }).waitFor();
  const resumed = await creator.evaluate(() => JSON.parse(localStorage.getItem("spooky-local-run")).run);
  assert.deepEqual(resumed.challenge, created.challenge);
  assert.equal(resumed.tokenId, created.tokenId);
});

test("resume an unresolved landing and a committed purchase without charging twice", { timeout: 45000 }, async t => {
  const browser = await chromium.launch();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: viewports[1], reducedMotion: "reduce" });
  await serveGame(page);
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.goto(origin);
  await page.getByRole("button", { name: "Choose Human token 1" }).click();
  await page.getByRole("button", { name: /Roll Dice/ }).click();
  const buy = page.getByRole("button", { name: "Buy for $60" });
  await buy.waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await buy.waitFor();
  assert.equal(await page.locator(".game-sidebar__mobile-balance").innerText(), "Cash: $1000");
  await buy.click();
  await page.getByRole("button", { name: /Roll Dice/ }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: /Roll Dice/ }).waitFor();
  assert.equal(await page.locator(".game-sidebar__mobile-balance").innerText(), "Cash: $940");
  assert.match(await page.locator(".game-board__space--active").innerText(), /Owned/);
  assert.match(await page.locator(".game-info__position").innerText(), /1\/20/);
  assert.equal(await page.getByRole("dialog").count(), 0);

  await page.reload();
  await page.getByRole("button", { name: "Start new", exact: true }).click();
  await page.getByRole("button", { name: "Choose Human token 1" }).waitFor();
  for (const badSave of ["{", '{"version":2,"run":{}}']) {
    await page.evaluate(value => localStorage.setItem("spooky-local-run", value), badSave);
    await page.reload();
    await page.getByRole("button", { name: "Choose Human token 1" }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Resume", exact: true }).count(), 0);
  }
});

async function serveGame(page) {
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === "/") {
      const body = await readFile(".next/server/app/index.html");
      return route.fulfill({ contentType: "text/html", body });
    }
    if (url.pathname.startsWith("/_next/static/")) {
      return route.fulfill({ path: ".next/" + url.pathname.slice("/_next/".length) });
    }
    if (url.pathname === "/api/submit") {
      return route.fulfill({ status: 503, json: { success: false } });
    }
    if (url.pathname === "/api/stats") {
      return route.fulfill({ status: 503, json: { success: false, code: "STATS_UNCONFIGURED" } });
    }
    return route.fulfill({ status: 404 });
  });
}

test("complete and restart a fixed-roll solo game on narrow and landscape screens", { timeout: 90000, concurrency: true }, async t => {
  const browser = await chromium.launch();
  t.after(() => browser.close());

  await Promise.all(viewports.map(viewport =>
    t.test(`${viewport.width} × ${viewport.height}`, async () => {
      const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
      try {
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        await serveGame(page);
        await page.addInitScript(() => {
          Math.random = () => 0;
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: { writeText: async text => { window.copiedResult = text; } }
          });
        });
        await page.goto(origin);

        const buyProperty = viewport.width === 390;
        await page.getByRole("button", { name: "Choose Human token 1" }).click();
        const roll = page.getByRole("button", { name: /Roll Dice/ });
        await roll.waitFor();
        const contrast = await roll.evaluate(button => {
          const style = getComputedStyle(button);
          const luminance = color => color.match(/\d+/g).slice(0, 3)
            .map(value => Number(value) / 255)
            .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
            .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
          const sorted = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => b - a);
          return (sorted[0] + 0.05) / (sorted[1] + 0.05);
        });
        assert.ok(contrast >= 4.5);

        for (let turn = 0; turn < 20; turn++) {
          const bounds = await roll.boundingBox();
          assert.ok(bounds && bounds.height >= 44 && bounds.y >= 0 &&
            bounds.y + bounds.height <= viewport.height, "Roll should remain reachable");
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
          if (turn === 0 && !buyProperty) await roll.press("Enter");
          else await roll.click();

          const dialog = page.getByRole("dialog");
          await dialog.waitFor();
          const action = dialog.getByRole("button", {
            name: turn === 0 && buyProperty ? /^Buy for / : /^(Pass|Continue)$/
          });
          const target = await action.boundingBox();
          assert.ok(target && target.height >= 44, "The turn choice should be a large tap target");
          if (turn === 0 && !buyProperty) {
            await page.keyboard.press("Tab");
            assert.ok(await action.evaluate(button => button === document.activeElement));
            await page.keyboard.press("Enter");
          } else {
            await action.click();
          }
          await dialog.waitFor({ state: "hidden" });
          if (turn === 0) assert.ok(await roll.evaluate(button => button === document.activeElement));
          if (turn === 16 && buyProperty) {
            assert.match(await page.locator(".game-board__space--active").innerText(), /Owned/);
          }
        }

        await page.getByRole("button", { name: /End Game/ }).click();
        await page.getByText("Shared statistics are not configured for this game.").waitFor();
        if (!buyProperty) await page.getByText(/Elf tokens unlocked/).waitFor();
        const finalBalance = await page.locator(".end-game__stat-value").first().innerText();
        assert.equal(finalBalance, buyProperty ? "$1249" : "$1300");
        const ledger = page.getByRole("region", { name: "Ghost Ledger" });
        const choices = ledger.getByLabel("Alternate property choice");
        if (buyProperty) {
          await choices.selectOption("1:pass");
          const first = ledger.getByRole("row", { name: /^1 \(changed\)/ });
          assert.match(await first.innerText(), /\$940\s+Pumpkin Exploitation Plaza\s+\$1000\s+No properties/);
          assert.match(await ledger.getByRole("status").innerText(), /Replay stopped on turn 17.*Continue action is no longer legal/s);
          assert.match(await ledger.getByRole("row", { name: /^17\s/ }).innerText(), /Stopped/);
        } else {
          await choices.selectOption("20:buy");
          const last = ledger.getByRole("row", { name: /^20 \(changed\)/ });
          assert.match(await last.innerText(), /\$1300\s+No properties\s+\$1180\s+Seasonal Parasite Plaza/);
          assert.equal(await ledger.getByRole("status").count(), 0);
        }
        assert.equal(await page.locator(".end-game__stat-value").first().innerText(), finalBalance);
        if (buyProperty) {
          const copy = page.getByRole("button", { name: "Copy result text" });
          await copy.click();
          await page.getByText("Result copied.", { exact: true }).waitFor();
          assert.match(await page.evaluate(() => window.copiedResult),
            /Human\n\$1249 cash · 1 property · \$60 total property value/);
          await page.evaluate(() => {
            Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
          });
          await copy.click();
          assert.match(await page.getByRole("textbox", { name: "Result text" }).inputValue(), /Spooky Monopoly/);
          const downloaded = page.waitForEvent("download");
          await page.getByRole("button", { name: "Download result image" }).click();
          const image = await downloaded;
          assert.equal(image.suggestedFilename(), "spooky-monopoly-result.png");
          const stream = await image.createReadStream();
          const chunks = [];
          for await (const chunk of stream) chunks.push(chunk);
          assert.deepEqual([...Buffer.concat(chunks).subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
        }
        await page.getByRole("button", { name: /Restart the Haunting Cycle/ }).click();
        await page.getByRole("button", { name: "Choose Human token 1" }).waitFor();
        if (!buyProperty) {
          await page.getByRole("button", { name: "Choose Elf token 1" }).waitFor();
          await page.reload();
          await page.getByRole("button", { name: "Choose Elf token 1" }).waitFor();
        }
        assert.deepEqual(errors, []);
      } finally {
        await page.close();
      }
    })
  ));
});
