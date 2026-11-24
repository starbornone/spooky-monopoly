import { NextRequest, NextResponse } from "next/server";
import { pilotConfig, PilotRooms } from "./pilotRooms";

export const pilotJson = (value: unknown, status = 200) =>
  NextResponse.json(value, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });

export const pilotError = (code: string, status: number) => pilotJson({ ok: false, code }, status);
export const seatCookieName = (roomId: string) => `spooky-pilot-${roomId}`;

export function seatResponse(roomId: string, credential: string, origin: URL, body: object, status: number) {
  const response = pilotJson(body, status);
  response.cookies.set(seatCookieName(roomId), credential, {
    httpOnly: true,
    secure: origin.protocol === "https:",
    sameSite: "strict",
    path: `/api/multiplayer/${roomId}`
  });
  return response;
}

export async function withPilotRooms(
  request: NextRequest,
  handler: (rooms: PilotRooms, origin: URL) => Response | Promise<Response>
) {
  const config = pilotConfig();
  if (!config) return pilotError("pilot-unavailable", 503);
  if (request.method === "POST" && request.headers.get("origin") !== config.origin.origin) {
    return pilotError("wrong-origin", 403);
  }
  let rooms: PilotRooms | undefined;
  try {
    rooms = await PilotRooms.open(config.databasePath);
    return await handler(rooms, config.origin);
  } catch {
    return pilotError("pilot-unavailable", 503);
  } finally {
    rooms?.close();
  }
}

export async function readPilotBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json") || !request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
    const value: unknown = JSON.parse(body + decoder.decode());
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
