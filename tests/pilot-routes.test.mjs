import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
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

    const legacyId = "a".repeat(32);
    const legacyToken = "b".repeat(48);
    const legacy = new DatabaseSync(databasePath);
    try {
      legacy.exec(`
        CREATE TABLE pilot_rooms (
          id TEXT PRIMARY KEY,
          invite_hash TEXT NOT NULL,
          host_hash TEXT NOT NULL,
          guest_hash TEXT,
          host_name TEXT NOT NULL DEFAULT 'Host',
          guest_name TEXT,
          host_ready INTEGER NOT NULL DEFAULT 0,
          guest_ready INTEGER NOT NULL DEFAULT 0,
          revision INTEGER NOT NULL DEFAULT 0,
          match_json TEXT
        ) STRICT;
      `);
      legacy.prepare("INSERT INTO pilot_rooms (id, invite_hash, host_hash, host_name) VALUES (?, ?, ?, ?)")
        .run(legacyId, "", createHash("sha256").update(legacyToken).digest("hex"), "Earlier host");
    } finally {
      legacy.close();
    }
    const migrated = await send(`${collection}/${legacyId}`, { cookie: `spooky-pilot-${legacyId}=${legacyToken}` });
    assert.equal(migrated.status, 200);
    assert.equal(migrated.data.room.players[0].name, "Earlier host");
    assert.equal(migrated.data.room.players[0].presence.away, false);
    assert.equal(migrated.data.room.closed, null);

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
    assert.deepEqual(started.data.room.players.map(({ name, ready }) => ({ name, ready })),
      [{ name: "Midnight", ready: true }, { name: "Graveyard", ready: true }]);

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
    const finishedLeave = await send(path, { cookie: host, payload: { type: "leave" } });
    assert.equal(finishedLeave.data.code, "match-finished");

    async function startedRoom() {
      const created = await send(collection, { payload: {} });
      const roomPath = `${collection}/${created.data.roomId}`;
      const hostCookie = created.cookie.split(";")[0];
      const joined = await send(roomPath, { payload: { type: "join", invite: created.data.invite } });
      const guestCookie = joined.cookie.split(";")[0];
      await send(roomPath, { cookie: hostCookie, payload: { type: "ready", name: "Host" } });
      const ready = await send(roomPath, { cookie: guestCookie, payload: { type: "ready", name: "Guest" } });
      assert.equal(ready.data.room.match.revision, 0);
      return { id: created.data.roomId, path: roomPath, cookies: [hostCookie, guestCookie], match: ready.data.room.match };
    }
    const setGuestAge = (id, seconds) => {
      const db = new DatabaseSync(databasePath);
      try {
        db.prepare("UPDATE pilot_rooms SET guest_seen_at = ? WHERE id = ?").run(Date.now() - seconds * 1000, id);
      } finally {
        db.close();
      }
    };

    const away = await startedRoom();
    setGuestAge(away.id, 20);
    const observe = () => send(away.path, { cookie: away.cookies[0] });
    const attempt = () => send(away.path, { cookie: away.cookies[0], payload: { type: "abandon" } });
    const absent = await observe();
    assert.equal(absent.data.room.players[1].presence.away, true);
    assert.ok(absent.data.room.players[1].presence.graceSeconds > 0);
    assert.equal((await attempt()).data.code, "grace-period");
    const returned = await send(away.path, { cookie: away.cookies[1] });
    assert.equal(returned.data.seat, 1);
    assert.equal(returned.data.room.players[1].presence.away, false);
    assert.deepEqual(returned.data.room.match, away.match);
    assert.equal((await attempt()).data.code, "grace-period");

    setGuestAge(away.id, 80);
    const ended = await attempt();
    assert.deepEqual(ended.data.room.closed, { reason: "timeout", seat: 1 });
    assert.deepEqual(ended.data.room.match, away.match);
    assert.deepEqual((await attempt()).data.room, ended.data.room);
    const rejoin = await send(away.path, { cookie: away.cookies[1] });
    assert.deepEqual(rejoin.data.room.closed, ended.data.room.closed);
    assert.equal((await send(away.path, { cookie: away.cookies[away.match.firstSeat], payload })).data.code, "room-closed");

    const leaving = await startedRoom();
    const first = leaving.cookies[leaving.match.firstSeat];
    const rolled = await send(leaving.path, { cookie: first, payload });
    assert.equal(rolled.data.match.phase.kind, "choice");
    const left = await send(leaving.path, { cookie: first, payload: { type: "leave" } });
    assert.deepEqual(left.data.room.closed, { reason: "left", seat: leaving.match.firstSeat });
    assert.deepEqual(left.data.room.match, rolled.data.match);
    const subsequent = await send(leaving.path, { cookie: first, payload: {
      type: "turn", intent: { actionId: "after-leave", expectedRevision: 1, action: "pass" }
    } });
    assert.equal(subsequent.data.code, "room-closed");
  } finally {
    delete process.env.SPOOKY_PILOT_DB_PATH;
    delete process.env.SPOOKY_PILOT_ORIGIN;
    if (server.listening) await new Promise(resolve => server.close(resolve));
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
