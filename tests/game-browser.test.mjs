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
        await page.addInitScript(() => { Math.random = () => 0; });
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
