import { createHash, randomBytes } from "node:crypto";
import { isAbsolute } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { createPilotMatch, type PilotMatch, type PilotMatchStore, type PilotSeat } from "./pilotMatch";

const secret = () => randomBytes(24).toString("hex");
export const isPilotSecret = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{48}$/.test(value);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

interface RoomRow {
  id: string;
  host_name: string;
  guest_name: string | null;
  host_ready: number;
  guest_ready: number;
  match_json: string | null;
  host_seen_at: number;
  guest_seen_at: number | null;
  closed_seat: PilotSeat | null;
  closed_reason: "left" | "timeout" | null;
}

const awayAfter = 15_000;
const abandonAfter = 75_000;

function presence(lastSeen: number | null, now: number) {
  const elapsed = lastSeen === null ? 0 : Math.max(0, now - lastSeen);
  return {
    away: elapsed >= awayAfter,
    graceSeconds: Math.max(0, Math.ceil((abandonAfter - elapsed) / 1000))
  };
}

export function pilotConfig() {
  const databasePath = process.env.SPOOKY_PILOT_DB_PATH;
  const configuredOrigin = process.env.SPOOKY_PILOT_ORIGIN;
  if (!databasePath || !isAbsolute(databasePath) || !configuredOrigin) return null;
  try {
    const origin = new URL(configuredOrigin);
    const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
    if (origin.origin !== configuredOrigin || (origin.protocol !== "https:" && !(origin.protocol === "http:" && isLoopback))) {
      return null;
    }
    return { databasePath, origin };
  } catch {
    return null;
  }
}

export class PilotRooms implements PilotMatchStore {
  private constructor(private readonly db: DatabaseSync) {}

  static async open(databasePath: string) {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(databasePath);
    try {
      db.exec(`
        PRAGMA busy_timeout = 5000;
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS pilot_rooms (
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
        CREATE TABLE IF NOT EXISTS pilot_receipts (
          room_id TEXT NOT NULL REFERENCES pilot_rooms (id) ON DELETE CASCADE,
          seat INTEGER NOT NULL CHECK (seat IN (0, 1)),
          action_id TEXT NOT NULL,
          receipt_json TEXT NOT NULL,
          PRIMARY KEY (room_id, seat, action_id)
        ) STRICT;
      `);
      const rooms = new PilotRooms(db);
      rooms.migratePresence();
      return rooms;
    } catch (error) {
      db.close();
      throw error;
    }
  }

  private migratePresence() {
    const hasPresence = () => this.db.prepare("PRAGMA table_info(pilot_rooms)").all()
      .some(column => column.name === "closed_reason");
    if (hasPresence()) return;

    this.transaction(() => {
      if (hasPresence()) return;
      this.db.exec(`
        ALTER TABLE pilot_rooms ADD COLUMN host_seen_at INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE pilot_rooms ADD COLUMN guest_seen_at INTEGER;
        ALTER TABLE pilot_rooms ADD COLUMN closed_seat INTEGER CHECK (closed_seat IN (0, 1));
        ALTER TABLE pilot_rooms ADD COLUMN closed_reason TEXT CHECK (closed_reason IN ('left', 'timeout'));
      `);
      const now = Date.now();
      this.db.prepare(`
        UPDATE pilot_rooms
        SET host_seen_at = ?, guest_seen_at = CASE WHEN guest_hash IS NOT NULL THEN ? END
      `).run(now, now);
    });
  }

  close() {
    this.db.close();
  }

  private transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  createRoom() {
    const roomId = randomBytes(16).toString("hex");
    const invite = secret();
    const credential = secret();
    this.db.prepare("INSERT INTO pilot_rooms (id, invite_hash, host_hash, host_seen_at) VALUES (?, ?, ?, ?)")
      .run(roomId, digest(invite), digest(credential), Date.now());
    return { roomId, invite, credential };
  }

  joinRoom(roomId: string, invite: string) {
    const credential = secret();
    const { changes } = this.db.prepare(`
      UPDATE pilot_rooms SET guest_hash = ?, guest_name = 'Guest', guest_seen_at = ?
      WHERE id = ? AND invite_hash = ? AND guest_hash IS NULL AND closed_reason IS NULL
    `).run(digest(credential), Date.now(), roomId, digest(invite));
    return changes === 1 ? credential : null;
  }

  authenticate(roomId: string, credential: string | undefined): PilotSeat | null {
    if (!isPilotSecret(credential)) return null;
    const hash = digest(credential);
    const row = this.db.prepare(`
      SELECT CASE WHEN host_hash = ? THEN 0 ELSE 1 END AS seat
      FROM pilot_rooms WHERE id = ? AND (host_hash = ? OR guest_hash = ?)
    `).get(hash, roomId, hash, hash) as { seat: PilotSeat } | undefined;
    return row?.seat ?? null;
  }

  touch(roomId: string, seat: PilotSeat) {
    const column = seat === 0 ? "host_seen_at" : "guest_seen_at";
    const now = Date.now();
    this.db.prepare(`
      UPDATE pilot_rooms SET ${column} = ?
      WHERE id = ? AND closed_reason IS NULL AND (${column} IS NULL OR ${column} <= ?)
    `).run(now, roomId, now - 3000);
  }

  readRoom(roomId: string, now = Date.now()) {
    const row = this.db.prepare(`
      SELECT id, host_name, guest_name, host_ready, guest_ready, match_json,
        host_seen_at, guest_seen_at, closed_seat, closed_reason
      FROM pilot_rooms WHERE id = ?
    `).get(roomId) as RoomRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      players: [
        { name: row.host_name, ready: Boolean(row.host_ready), presence: presence(row.host_seen_at, now) },
        row.guest_name === null ? null : {
          name: row.guest_name, ready: Boolean(row.guest_ready), presence: presence(row.guest_seen_at, now)
        }
      ] as const,
      match: row.match_json ? JSON.parse(row.match_json) as PilotMatch : null,
      closed: row.closed_reason === null ? null : { reason: row.closed_reason, seat: row.closed_seat }
    };
  }

  closeRoom(roomId: string, seat: PilotSeat, action: "leave" | "abandon") {
    return this.transaction(() => {
      const room = this.readRoom(roomId);
      if (!room) return "room-not-found" as const;
      if (room.closed) return null;
      if (room.match?.phase.kind === "finished") return "match-finished" as const;

      const other = seat === 0 ? 1 : 0;
      if (action === "abandon") {
        if (!room.match || room.players[other]?.presence.graceSeconds !== 0) return "grace-period" as const;
      }
      this.db.prepare("UPDATE pilot_rooms SET closed_seat = ?, closed_reason = ? WHERE id = ?")
        .run(action === "leave" ? seat : other, action === "leave" ? "left" : "timeout", roomId);
      return null;
    });
  }

  ready(roomId: string, seat: PilotSeat, name: string): boolean {
    return this.transaction(() => {
      const statement = seat === 0
        ? "UPDATE pilot_rooms SET host_name = ?, host_ready = 1 WHERE id = ? AND match_json IS NULL AND closed_reason IS NULL"
        : "UPDATE pilot_rooms SET guest_name = ?, guest_ready = 1 WHERE id = ? AND match_json IS NULL AND closed_reason IS NULL";
      if (this.db.prepare(statement).run(name, roomId).changes !== 1) return false;

      const room = this.readRoom(roomId);
      if (room?.players.every(player => player?.ready)) {
        this.db.prepare("UPDATE pilot_rooms SET match_json = ? WHERE id = ?")
          .run(JSON.stringify(createPilotMatch()), roomId);
      }
      return true;
    });
  }

  async readMatch(roomId: string) {
    return this.readRoom(roomId)?.match ?? null;
  }

  async readReceipt(roomId: string, seat: PilotSeat, actionId: string) {
    const row = this.db.prepare("SELECT receipt_json FROM pilot_receipts WHERE room_id = ? AND seat = ? AND action_id = ?")
      .get(roomId, seat, actionId) as { receipt_json: string } | undefined;
    return row ? JSON.parse(row.receipt_json) : null;
  }

  async commit(roomId: string, seat: PilotSeat, expectedRevision: number, receipt: Parameters<PilotMatchStore["commit"]>[3]) {
    return this.transaction(() => {
      const existing = this.db.prepare("SELECT 1 FROM pilot_receipts WHERE room_id = ? AND seat = ? AND action_id = ?")
        .get(roomId, seat, receipt.intent.actionId);
      if (existing) return false;
      const updated = this.db.prepare(`
        UPDATE pilot_rooms SET revision = ?, match_json = ?
        WHERE id = ? AND revision = ? AND match_json IS NOT NULL AND closed_reason IS NULL
      `).run(receipt.match.revision, JSON.stringify(receipt.match), roomId, expectedRevision);
      if (updated.changes !== 1) return false;
      this.db.prepare("INSERT INTO pilot_receipts VALUES (?, ?, ?, ?)")
        .run(roomId, seat, receipt.intent.actionId, JSON.stringify(receipt));
      return true;
    });
  }
}
