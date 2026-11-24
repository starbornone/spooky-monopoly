import type { NextRequest } from "next/server";
import { seatResponse, withPilotRooms } from "../../server/multiplayer/pilotHttp";

export const runtime = "nodejs";

export function POST(request: NextRequest) {
  return withPilotRooms(request, (rooms, origin) => {
    const { roomId, invite, credential } = rooms.createRoom();
    return seatResponse(roomId, credential, origin, { ok: true, roomId, invite }, 201);
  });
}
