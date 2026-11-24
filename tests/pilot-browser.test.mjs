import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import next from "next";
import { chromium } from "playwright-core";

const origin = "http://localhost:3000";

async function attach(page, forward) {
  await page.route(origin + "/**", async route => {
    const incoming = route.request();
    const url = new URL(incoming.url());
    if (url.pathname === "/") return route.fulfill({ path: ".next/server/app/index.html", contentType: "text/html" });
    if (url.pathname === "/multiplayer") return route.fulfill({ path: ".next/server/app/multiplayer.html", contentType: "text/html" });
    if (url.pathname.startsWith("/_next/static/")) {
      return route.fulfill({ path: ".next/" + url.pathname.slice("/_next/".length) });
    }
    if (url.pathname === "/artwork/pumpkin.webp") {
      return route.fulfill({ path: "public/artwork/pumpkin.webp", contentType: "image/webp" });
    }
    if (!url.pathname.startsWith("/api/multiplayer")) return route.fulfill({ status: 404 });
    await forward(route, incoming, url);
  });
}

function roomRelay(socketPath, dropReply) {
  let pending = Promise.resolve();
  const deliver = async (route, incoming, url) => {
    const headers = await incoming.allHeaders();
    delete headers["accept-encoding"];
    headers.connection = "close";
    headers.host = url.host;
    const body = incoming.postDataBuffer();
    if (body) headers["content-length"] = String(body.length);
    const response = await new Promise((resolve, reject) => {
      const outgoing = request({ socketPath, path: url.pathname + url.search, headers, method: incoming.method() }, reply => {
        const parts = [];
        reply.on("data", part => parts.push(part));
        reply.on("error", reject);
        reply.on("end", () => resolve({
          status: reply.statusCode,
          headers: Object.fromEntries(Object.entries(reply.headers)
            .filter(([key]) => key !== "transfer-encoding" && key !== "connection")
            .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])),
          body: Buffer.concat(parts)
        }));
      });
      outgoing.on("error", reject);
      outgoing.end(body);
    });
    if (dropReply(incoming, response)) await route.abort("connectionreset");
    else await route.fulfill(response);
  };
  return (route, incoming, url) => {
    const nextRequest = pending.then(() => deliver(route, incoming, url));
    pending = nextRequest.catch(() => {});
    return nextRequest;
  };
}

test("two browsers can join, resume a seat and finish the private pilot in sync", { timeout: 120000 }, async t => {
  const directory = await mkdtemp(join(tmpdir(), "spooky-pilot-ui-"));
  const socketPath = process.platform === "win32"
    ? `\\\\.\\pipe\\spooky-pilot-ui-${randomUUID()}`
    : join(directory, "server.sock");
  const databasePath = join(directory, "pilot.sqlite");
  process.env.SPOOKY_PILOT_DB_PATH = databasePath;
  process.env.SPOOKY_PILOT_ORIGIN = origin;
  const app = next({ dev: false, hostname: "localhost", port: 3000 });
  const server = createServer(app.getRequestHandler());
  let browser;
  let firstRollAt;

  function setGuestAge(roomUrl, seconds) {
    const roomId = new URL(roomUrl).searchParams.get("room");
    const database = new DatabaseSync(databasePath);
    try {
      const { changes } = database.prepare("UPDATE pilot_rooms SET guest_seen_at = ? WHERE id = ?")
        .run(Date.now() - seconds * 1000, roomId);
      assert.equal(changes, 1);
    } finally {
      database.close();
    }
  }

  try {
    await app.prepare();
    const listening = once(server, "listening");
    server.listen(socketPath);
    await listening;
    browser = await chromium.launch();
    const host = await browser.newPage({ viewport: { width: 320, height: 700 } });
    const guestProfile = await browser.newContext({ viewport: { width: 320, height: 700 } });
    let guest = await guestProfile.newPage();
    const forward = roomRelay(socketPath, (request, response) => {
      if (firstRollAt !== undefined || response.status !== 200 || request.method() !== "POST" ||
        request.postDataJSON()?.intent?.action !== "roll") return false;
      firstRollAt = performance.now();
      return true;
    });
    await Promise.all([attach(host, forward), attach(guest, forward)]);
    await host.goto(origin);
    await host.getByRole("link", { name: "Play with a friend" }).click();
    const [creation] = await Promise.all([
      host.waitForResponse(response => response.url() === origin + "/api/multiplayer" && response.request().method() === "POST"),
      host.getByRole("button", { name: "Create private room" }).click(),
    ]);
    assert.equal(creation.status(), 201);
    const invite = await host.getByRole("textbox", { name: "Invite link" }).inputValue();
    const inviteAt = performance.now();
    assert.match(invite, /#invite=[0-9a-f]{48}$/);
    await guest.goto(invite);
    await guest.getByRole("button", { name: "Join as guest" }).click();
    await guest.getByRole("textbox", { name: "Display name" }).waitFor();
    assert.equal(new URL(guest.url()).hash, "");
    await host.getByRole("textbox", { name: "Display name" }).fill("Midnight");
    await guest.getByRole("textbox", { name: "Display name" }).fill("Graveyard");
    await host.getByRole("button", { name: "Ready" }).click();
    await guest.getByRole("button", { name: "Ready" }).click();
    await Promise.all([host.getByText(/Round 1 of 10/).waitFor(), guest.getByText(/Round 1 of 10/).waitFor()]);
    for (const page of [host, guest]) {
      const board = page.getByRole("region", { name: "Shared board" });
      assert.equal(await board.getByRole("button").count(), 16);
      const start = board.getByRole("button", { name: "GO (Harvest of Souls), Midnight is here, Graveyard is here" });
      assert.deepEqual(await start.locator(".pilot-board__token").allTextContents(), ["P1", "P2"]);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    }
    assert.equal(await host.getByRole("button", { name: "Roll", exact: true }).count() +
      await guest.getByRole("button", { name: "Roll", exact: true }).count(), 1);
    const timings = [];
    for (let revision = 1; revision <= 40; revision++) {
      if (await host.getByText(/Scores:/).count()) break;
      const action = revision === 2 ? /^Buy$/ : /^(Roll|Pass)$/;
      const active = await host.getByRole("button", { name: action }).count() ? host : guest;
      const observer = active === host ? guest : host;
      const started = performance.now();
      const control = active.getByRole("button", { name: action });
      const bounds = await control.boundingBox();
      assert.ok(bounds && bounds.height >= 44 && bounds.y >= 0 && bounds.y + bounds.height <= 700,
        "Primary controls should be reachable in the 320-pixel viewport");
      if (revision <= 2) await control.press("Enter");
      else await control.click();
      await observer.locator(`main[data-revision="${revision}"]`).waitFor();
      timings.push(performance.now() - started);
      await active.locator(`main[data-revision="${revision}"]`).waitFor();
      if (revision === 1) {
        assert.ok(firstRollAt >= inviteAt);
        await active.waitForFunction(() => document.activeElement?.textContent === "Buy");
        const board = active.getByRole("region", { name: "Shared board" });
        const square = board.locator(".pilot-board__tile--active");
        await square.press("Enter");
        const details = active.getByRole("region", { name: "Space details" });
        await details.getByRole("heading").waitFor();
        await active.waitForFunction(() => document.activeElement?.tagName === "H2");
        await active.keyboard.press("Tab");
        await active.keyboard.press("Enter");
        assert.equal(await details.count(), 0);
        assert.equal(await active.locator("main").getAttribute("data-revision"), "1");
        await active.getByRole("button", { name: "Buy", exact: true }).waitFor();
        assert.equal(await host.getByText(/Last roll:/).textContent(), await guest.getByText(/Last roll:/).textContent());
        const guestRoom = guest.url();
        await guest.close();
        setGuestAge(guestRoom, 20);
        const reconnectWindow = host.getByText(/Graveyard has \d+ seconds to reconnect/);
        await reconnectWindow.waitFor();

        guest = await guestProfile.newPage();
        await attach(guest, forward);
        await guest.goto(guestRoom);
        await guest.getByText("Graveyard (you)").waitFor();
        await guest.locator('main[data-revision="1"]').waitFor();
        await reconnectWindow.waitFor({ state: "hidden" });
        assert.equal(await host.getByText(/Last roll:/).textContent(), await guest.getByText(/Last roll:/).textContent());
        assert.equal(await guest.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      }
      if (revision === 2) {
        const owner = active === host ? "Midnight" : "Graveyard";
        const label = active === host ? "P1 owns" : "P2 owns";
        for (const page of [host, guest]) {
          const owned = page.getByRole("region", { name: "Shared board" }).getByRole("button", { name: new RegExp(`owned by ${owner}`) });
          assert.equal(await owned.locator(".pilot-board__owner").textContent(), label);
        }
      }
    }
    const result = await host.getByText(/Scores:/).textContent();
    assert.equal(await guest.getByText(/Scores:/).textContent(), result);
    const finishedRoomId = new URL(host.url()).searchParams.get("room");
    const finishedDatabase = new DatabaseSync(databasePath, { readOnly: true });
    try {
      const stored = finishedDatabase.prepare("SELECT match_json FROM pilot_rooms WHERE id = ?").get(finishedRoomId);
      const match = JSON.parse(stored.match_json);
      assert.equal(match.phase.kind, "finished");
      assert.equal(match.completedTurns, 20);
      assert.equal(match.revision, timings.length);
      const revisions = finishedDatabase.prepare("SELECT receipt_json FROM pilot_receipts WHERE room_id = ?")
        .all(finishedRoomId).map(row => JSON.parse(row.receipt_json).match.revision).sort((a, b) => a - b);
      assert.deepEqual(revisions, Array.from({ length: match.revision }, (_, index) => index + 1));
    } finally {
      finishedDatabase.close();
    }
    const recaps = [];
    const images = [];
    for (const page of [host, guest]) {
      assert.equal(await page.getByRole("textbox", { name: "Invite link" }).count(), 0);
      await page.evaluate(useClipboard => {
        Object.defineProperty(navigator, "clipboard", {
          value: { writeText: async text => {
            if (!useClipboard) throw new Error("Clipboard unavailable");
            document.body.dataset.clipboard = text;
          } }
        });
      }, page === host);
      const share = page.getByRole("region", { name: "Share match recap" });
      await share.getByRole("button", { name: "Copy recap text" }).click();
      if (page === host) {
        await share.getByText("Recap copied.").waitFor();
        recaps.push(await page.locator("body").getAttribute("data-clipboard"));
      } else {
        recaps.push(await share.getByRole("textbox", { name: "Recap text" }).inputValue());
      }
      const download = page.waitForEvent("download");
      await share.getByRole("button", { name: "Download recap image" }).click();
      const image = await download;
      assert.equal(image.suggestedFilename(), "spooky-monopoly-match.png");
      const chunks = [];
      for await (const chunk of await image.createReadStream()) chunks.push(chunk);
      images.push(Buffer.concat(chunks));
    }
    const [, firstScore, secondScore] = result.match(/Scores: (\d+) to (\d+)$/);
    assert.equal(recaps[0], recaps[1]);
    assert.equal(recaps[0].split("\n")[1], result.split(" · Scores:")[0]);
    assert.ok(recaps[0].includes(`P1 · Midnight: ${firstScore} points`));
    assert.ok(recaps[0].includes(`P2 · Graveyard: ${secondScore} points`));
    assert.match(recaps[0], /\b1 property\b/);
    assert.match(recaps[0], /10 rounds played$/);
    assert.doesNotMatch(recaps[0], /https?:\/\/|\b[a-f0-9]{48}\b/);
    assert.equal(images[0].subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.deepEqual(images[0], images[1]);
    assert.ok(timings.length >= 20);
    const p95 = timings.sort((a, b) => a - b)[Math.ceil(timings.length * 0.95) - 1];
    assert.ok(p95 < 3000, `Expected p95 < 3000 ms, got ${Math.round(p95)} ms`);
    t.diagnostic(`Local automation: invite to first accepted roll ${Math.round(firstRollAt - inviteAt)} ms, ` +
      `turn observation p95 ${Math.round(p95)} ms, full match finished after guest reconnect.`);

    await host.goto(origin + "/multiplayer");
    await host.getByRole("button", { name: "Create private room" }).click();
    await guest.goto(await host.getByRole("textbox", { name: "Invite link" }).inputValue());
    await guest.getByRole("button", { name: "Join as guest" }).click();
    await host.getByRole("button", { name: "Ready" }).click();
    await guest.getByRole("button", { name: "Ready" }).click();
    await host.locator('main[data-revision="0"]').waitFor();
    await guest.close();

    setGuestAge(host.url(), 20);
    await host.getByText(/seconds to reconnect/).waitFor();
    assert.equal(await host.getByRole("button", { name: "End abandoned match" }).count(), 0);
    setGuestAge(host.url(), 80);
    await host.getByRole("button", { name: "End abandoned match" }).click();
    await host.getByText("The match was abandoned. No result was recorded.").waitFor();
    assert.equal(await host.getByText(/Scores:/).count(), 0);
    assert.equal(await host.getByRole("region", { name: "Share match recap" }).count(), 0);
    assert.equal(await host.locator("main").getAttribute("data-revision"), "0");
  } finally {
    await browser?.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    await app.close();
    delete process.env.SPOOKY_PILOT_DB_PATH;
    delete process.env.SPOOKY_PILOT_ORIGIN;
    await rm(directory, { recursive: true, force: true });
  }
});
