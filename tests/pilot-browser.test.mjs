import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    if (!url.pathname.startsWith("/api/multiplayer")) return route.fulfill({ status: 404 });
    await forward(route, incoming, url);
  });
}

function roomRelay(socketPath) {
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
    await route.fulfill(response);
  };
  return (route, incoming, url) => {
    const nextRequest = pending.then(() => deliver(route, incoming, url));
    pending = nextRequest.catch(() => {});
    return nextRequest;
  };
}

test("two browsers can join, resume a seat and finish the private pilot in sync", { timeout: 120000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "spooky-pilot-ui-"));
  const socketPath = process.platform === "win32"
    ? `\\\\.\\pipe\\spooky-pilot-ui-${randomUUID()}`
    : join(directory, "server.sock");
  process.env.SPOOKY_PILOT_DB_PATH = join(directory, "pilot.sqlite");
  process.env.SPOOKY_PILOT_ORIGIN = origin;
  const app = next({ dev: false, hostname: "localhost", port: 3000 });
  const server = createServer(app.getRequestHandler());
  let browser;

  try {
    await app.prepare();
    const listening = once(server, "listening");
    server.listen(socketPath);
    await listening;
    browser = await chromium.launch();
    const host = await browser.newPage({ viewport: { width: 320, height: 700 } });
    const guest = await browser.newPage({ viewport: { width: 320, height: 700 } });
    const forward = roomRelay(socketPath);
    await Promise.all([attach(host, forward), attach(guest, forward)]);
    await host.goto(origin);
    await host.getByRole("link", { name: "Play with a friend" }).click();
    await host.getByRole("button", { name: "Create private room" }).click();
    const invite = await host.getByRole("textbox", { name: "Invite link" }).inputValue();
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
    assert.equal(await host.getByRole("button", { name: "Roll", exact: true }).count() +
      await guest.getByRole("button", { name: "Roll", exact: true }).count(), 1);
    const timings = [];
    const action = /^(Roll|Pass)$/;
    for (let revision = 1; revision <= 40; revision++) {
      if (await host.getByText(/Scores:/).count()) break;
      const active = await host.getByRole("button", { name: action }).count() ? host : guest;
      const observer = active === host ? guest : host;
      const started = performance.now();
      await active.getByRole("button", { name: action }).click();
      await observer.locator(`main[data-revision="${revision}"]`).waitFor();
      timings.push(performance.now() - started);
      await active.locator(`main[data-revision="${revision}"]`).waitFor();
      if (revision === 1) {
        assert.equal(await host.getByText(/Last roll:/).textContent(), await guest.getByText(/Last roll:/).textContent());
        await guest.reload();
        await guest.getByText("Graveyard (you)").waitFor();
        await guest.locator('main[data-revision="1"]').waitFor();
        assert.equal(await guest.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      }
    }
    const result = await host.getByText(/Scores:/).textContent();
    assert.equal(await guest.getByText(/Scores:/).textContent(), result);
    assert.ok(timings.length >= 20);
    const p95 = timings.sort((a, b) => a - b)[Math.ceil(timings.length * 0.95) - 1];
    assert.ok(p95 < 3000, `Expected p95 < 3000 ms, got ${Math.round(p95)} ms`);
  } finally {
    await browser?.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    await app.close();
    delete process.env.SPOOKY_PILOT_DB_PATH;
    delete process.env.SPOOKY_PILOT_ORIGIN;
    await rm(directory, { recursive: true, force: true });
  }
});
