import type { NextRequest } from "next/server";
import { boardSpaces } from "../../../game/data";
import { pilotError, pilotJson, readPilotBody, seatCookieName, seatResponse, withPilotRooms } from "../../../server/multiplayer/pilotHttp";
import { executePilotIntent } from "../../../server/multiplayer/pilotMatch";
import { isPilotSecret } from "../../../server/multiplayer/pilotRooms";

export const runtime = "nodejs";

type Context = { params: Promise<{ roomId: string }> };
const validRoomId = (roomId: string) => /^[0-9a-f]{32}$/.test(roomId);

export async function GET(request: NextRequest, { params }: Context) {
  const { roomId } = await params;
  if (!validRoomId(roomId)) return pilotError("room-not-found", 404);
  return withPilotRooms(request, rooms => {
    const seat = rooms.authenticate(roomId, request.cookies.get(seatCookieName(roomId))?.value);
    if (seat === null) return pilotError("seat-required", 403);
    return pilotJson({ ok: true, seat, room: rooms.readRoom(roomId) });
  });
}

export async function POST(request: NextRequest, { params }: Context) {
  const { roomId } = await params;
  if (!validRoomId(roomId)) return pilotError("room-not-found", 404);
  return withPilotRooms(request, async (rooms, origin) => {
    const body = await readPilotBody(request);
    if (!body) return pilotError("invalid-request", 400);
    const seat = rooms.authenticate(roomId, request.cookies.get(seatCookieName(roomId))?.value);
    if (body.type === "join") {
      if (seat !== null) return pilotError("already-member", 409);
      if (!isPilotSecret(body.invite)) return pilotError("invalid-invite", 403);
      const credential = rooms.joinRoom(roomId, body.invite);
      if (!credential) return pilotError("invite-unavailable", 403);
      return seatResponse(roomId, credential, origin, { ok: true, seat: 1, room: rooms.readRoom(roomId) }, 200);
    }
    if (seat === null) return pilotError("seat-required", 403);
    if (body.type === "ready") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 32) return pilotError("invalid-name", 400);
      if (!rooms.ready(roomId, seat, name)) return pilotError("match-started", 409);
      return pilotJson({ ok: true, seat, room: rooms.readRoom(roomId) });
    }
    if (body.type !== "turn") return pilotError("invalid-request", 400);
    if (!await rooms.readMatch(roomId)) return pilotError("match-not-ready", 409);
    const result = await executePilotIntent(rooms, boardSpaces, { roomId, seat }, body.intent);
    return pilotJson(result, result.ok ? 200 : result.code === "invalid-intent" ? 400 : 409);
  });
}
