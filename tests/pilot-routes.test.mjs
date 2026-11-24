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

test("private rooms isolate seats, commit turns once and keep both seats in sync", async () => {
  const directory = await mkdtemp(join(tmpdir(), "spooky-pilot-"));
  const socketName = `spooky-pilot-${randomUUID()}`;
  const socketPath = process.platform === "win32"
    ? `\\\\.\\pipe\\${socketName}`
    : join(directory, "server.sock");
  const origin = "http://localhost:3000";
  const databasePath = join(directory, "pilot.sqlite");
  delete process.env.SPOOKY_PILOT_DB_PATH;
  process.env.SPOOKY_PILOT_ORIGIN = origin;
  const app = next({ dev: false, hostname: "localhost", port: 3000 });
  const server = createServer(app.getRequestHandler());

  const send = (path, { payload, cookie, from = origin } = {}) => new Promise((resolve, reject) => {
    const body = payload === undefined ? undefined : JSON.stringify(payload);
    const headers = { host: "localhost:3000" };
    if (cookie) headers.cookie = cookie;
    if (body !== undefined) Object.assign(headers, {
      origin: from,
      "content-type": "application/json",
      "content-length": Buffer.byteLength(body)
    });
    const req = request({ socketPath, path, method: body === undefined ? "GET" : "POST", headers }, response => {
      let content = "";
      response.setEncoding("utf8");
      response.on("data", chunk => { content += chunk; });
      response.on("error", reject);
      response.on("end", () => {
        try {
          resolve({ status: response.statusCode, data: JSON.parse(content), cookie: response.headers["set-cookie"]?.[0] });
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.end(body);
  });

  try {
    await app.prepare();
    const listening = once(server, "listening");
    server.listen(socketPath);
    await listening;
    const collection = "/api/multiplayer";
    assert.equal((await send(collection, { payload: {} })).status, 503);
    process.env.SPOOKY_PILOT_DB_PATH = databasePath;
    assert.equal((await send(collection, { payload: {}, from: "https://elsewhere.test" })).status, 403);

    const created = await send(collection, { payload: {} });
    assert.equal(created.status, 201);
    assert.match(created.cookie, /HttpOnly/i);
    assert.match(created.cookie, /SameSite=strict/i);
    const host = created.cookie.split(";")[0];
    const { roomId, invite } = created.data;
    const path = `${collection}/${roomId}`;
    assert.equal(created.data.credential, undefined);
    assert.equal((await send(path)).status, 403);
    assert.equal((await send(path, { cookie: host, payload: { type: "join", invite } })).status, 409);

    const other = await send(collection, { payload: {} });
    assert.equal((await send(`${collection}/${other.data.roomId}`, { cookie: host })).status, 403);
    assert.equal((await send(path, { payload: { type: "join", invite: other.data.invite } })).status, 403);
    const contenders = await Promise.all([
      send(path, { payload: { type: "join", invite } }),
      send(path, { payload: { type: "join", invite } })
    ]);
    assert.deepEqual(contenders.map(response => response.status).sort(), [200, 403]);
    const joined = contenders.find(response => response.status === 200);
    const guest = joined.cookie.split(";")[0];
    assert.notEqual(host, guest);
    assert.equal(joined.data.room.invite, undefined);
    assert.equal((await send(path, { cookie: host, payload: { type: "ready", name: "Midnight" } })).data.room.match, null);
    const started = await send(path, { cookie: guest, payload: { type: "ready", name: "Graveyard" } });
    assert.equal(started.data.room.match.revision, 0);
    assert.deepEqual(started.data.room.players, [{ name: "Midnight", ready: true }, { name: "Graveyard", ready: true }]);

    const active = [host, guest][started.data.room.match.firstSeat];
    const waiting = active === host ? guest : host;
    const payload = { type: "turn", intent: { actionId: "first-roll", expectedRevision: 0, action: "roll" } };
    assert.equal((await send(path, { cookie: waiting, payload })).data.code, "wrong-seat");
    const fault = new DatabaseSync(databasePath);
    try {
      fault.exec(`
        CREATE TRIGGER fail_one_receipt BEFORE INSERT ON pilot_receipts
        WHEN NEW.action_id = 'force-failure'
        BEGIN SELECT RAISE(ABORT, 'test receipt failure'); END
      `);
    } finally {
      fault.close();
    }
    const interrupted = await send(path, {
      cookie: active,
      payload: { ...payload, intent: { ...payload.intent, actionId: "force-failure" } }
    });
    assert.equal(interrupted.status, 503);
    assert.deepEqual((await send(path, { cookie: waiting })).data.room.match, started.data.room.match);
    const [accepted, replay] = await Promise.all([
      send(path, { cookie: active, payload }),
      send(path, { cookie: active, payload })
    ]);
    assert.equal(accepted.status, 200);
    assert.deepEqual(accepted, replay);
    assert.equal(accepted.data.match.revision, 1);

    const observer = await send(path, { cookie: waiting });
    assert.deepEqual(observer.data.room.match, accepted.data.match);
    assert.equal((await send(path, { cookie: host, payload: { type: "ready", name: "Rename" } })).status, 409);
    const reopened = new DatabaseSync(databasePath, { readOnly: true });
    try {
      assert.equal(reopened.prepare("SELECT count(*) AS total FROM pilot_receipts").get().total, 1);
      const row = reopened.prepare("SELECT invite_hash, host_hash FROM pilot_rooms WHERE id = ?").get(roomId);
      assert.notEqual(row.invite_hash, invite);
      assert.notEqual(row.host_hash, host.split("=")[1]);
    } finally {
      reopened.close();
    }

    let match = observer.data.room.match;
    for (let actions = 0; match.phase.kind !== "finished" && actions < 40; actions++) {
      const actingSeat = match.completedTurns % 2 === 0 ? match.firstSeat : 1 - match.firstSeat;
      const turn = await send(path, {
        cookie: [host, guest][actingSeat],
        payload: {
          type: "turn",
          intent: {
            actionId: `turn-${match.revision}`,
            expectedRevision: match.revision,
            action: match.phase.kind === "choice" ? "pass" : "roll"
          }
        }
      });
      assert.equal(turn.status, 200, JSON.stringify(turn.data));
      match = turn.data.match;
    }
    assert.equal(match.phase.kind, "finished");
    assert.equal(match.completedTurns, 20);
    assert.deepEqual((await send(path, { cookie: host })).data.room.match, match);
    assert.deepEqual((await send(path, { cookie: guest })).data.room.match, match);
  } finally {
    delete process.env.SPOOKY_PILOT_DB_PATH;
    delete process.env.SPOOKY_PILOT_ORIGIN;
    if (server.listening) await new Promise(resolve => server.close(resolve));
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
