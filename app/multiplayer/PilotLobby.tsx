"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { boardSpaces } from "../game/data";
import type { PilotMatch, PilotSeat } from "../server/multiplayer/pilotMatch";
import "./pilot.css";

interface RoomView {
  id: string;
  players: readonly [{ name: string; ready: boolean }, { name: string; ready: boolean } | null];
  match: PilotMatch | null;
}

interface RoomReply {
  ok: boolean;
  code?: string;
  roomId?: string;
  invite?: string;
  seat?: PilotSeat;
  room?: RoomView;
}

const endpoint = "/api/multiplayer";
const messages: Record<string, string> = {
  "pilot-unavailable": "The private pilot is unavailable on this server.",
  "invite-unavailable": "This invitation has already been used or is invalid.",
  "invalid-invite": "This invitation is invalid.",
  "seat-required": "Open an invitation to join, or use the browser that already joined.",
  "stale-revision": "The match changed. Review the latest turn.",
  "wrong-seat": "It is the other player's turn.",
  "unaffordable": "You cannot afford this property."
};

export function PilotLobby() {
  const [roomId, setRoomId] = useState("");
  const [guestInvite, setGuestInvite] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [room, setRoom] = useState<RoomView | null>(null);
  const [seat, setSeat] = useState<PilotSeat | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("room") ?? "";
    if (/^[0-9a-f]{32}$/.test(id)) setRoomId(id);
    setGuestInvite(new URLSearchParams(url.hash.slice(1)).get("invite") ?? "");
  }, []);

  const updateRoom = (reply: RoomReply) => {
    if (reply.seat !== undefined) setSeat(reply.seat);
    const next = reply.room;
    if (next) setRoom(current =>
      current?.match && (next.match?.revision ?? -1) < current.match.revision ? current : next
    );
  };

  useEffect(() => {
    if (!roomId || busy) return;
    let cancelled = false;
    let polling = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const response = await fetch(`${endpoint}/${roomId}`, { signal: controller.signal, cache: "no-store" });
        const reply: RoomReply = await response.json();
        if (!cancelled && reply.ok) {
          updateRoom(reply);
          setError(current => current === "Connection interrupted. Retrying." ? "" : current);
        }
        if (!cancelled && !reply.ok && !(reply.code === "seat-required" && guestInvite)) {
          setError(messages[reply.code ?? ""] ?? "Could not read the room.");
        }
      } catch {
        if (!cancelled) setError("Connection interrupted. Retrying.");
      } finally {
        polling = false;
        if (!cancelled && (seat !== null || !guestInvite)) timer = setTimeout(poll, 1500);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void poll();
      }
    };
    void poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [roomId, busy, guestInvite, seat]);

  const post = async (path: string, data: object, onSuccess?: (reply: RoomReply) => void) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const reply: RoomReply = await response.json();
      if (!reply.ok) {
        setError(messages[reply.code ?? ""] ?? "The request could not be completed.");
        return;
      }
      updateRoom(reply);
      onSuccess?.(reply);
    } catch {
      setError("Connection interrupted. Check the room state before trying again.");
    } finally {
      setBusy(false);
    }
  };

  const create = () => post(endpoint, {}, reply => {
    if (!reply.roomId || !reply.invite) return;
    const link = new URL("/multiplayer", window.location.origin);
    link.searchParams.set("room", reply.roomId);
    window.history.replaceState(null, "", link);
    link.hash = new URLSearchParams({ invite: reply.invite }).toString();
    setRoomId(reply.roomId);
    setShareLink(link.href);
  });

  const join = () => post(`${endpoint}/${roomId}`, { type: "join", invite: guestInvite }, () => {
    const url = new URL(window.location.href);
    url.hash = "";
    window.history.replaceState(null, "", url);
    setGuestInvite("");
  });

  const match = room?.match;
  const activeSeat = match && match.phase.kind !== "finished"
    ? (match.firstSeat + match.completedTurns) % 2
    : null;
  const ready = seat === null ? false : room?.players[seat]?.ready;
  const choiceId = match?.phase.kind === "choice" ? match.phase.spaceId : undefined;
  const choice = boardSpaces.find(space => space.id === choiceId);
  const turn = (action: "roll" | "buy" | "pass") => {
    if (!match) return;
    void post(`${endpoint}/${roomId}`, {
      type: "turn",
      intent: { actionId: crypto.randomUUID(), expectedRevision: match.revision, action }
    });
  };

  return (
    <main className="pilot" data-revision={match?.revision}>
      <Link href="/">Back to solo game</Link>
      <h1>Play with a friend</h1>
      {error && <p role="alert">{error}</p>}
      {!roomId && <button disabled={busy} onClick={create}>Create private room</button>}
      {roomId && seat === null && guestInvite && <button disabled={busy} onClick={join}>Join as guest</button>}
      {shareLink && (
        <label className="pilot__invite">
          Invite link
          <input value={shareLink} readOnly onFocus={event => event.currentTarget.select()} />
        </label>
      )}
      {room && (
        <>
          <ul className="pilot__seats" aria-label="Players">
            {room.players.map((player, index) => (
              <li className="pilot__seat" key={index}>
                <strong>{player?.name ?? "Guest seat open"}{seat === index ? " (you)" : ""}</strong>
                {match
                  ? <span>${match.players[index].cash} · {boardSpaces[match.players[index].position].name}</span>
                  : <span>{player?.ready ? "Ready" : "Waiting"}</span>}
              </li>
            ))}
          </ul>
          {!match && seat !== null && !ready && (
            <form onSubmit={event => {
              event.preventDefault();
              void post(`${endpoint}/${roomId}`, { type: "ready", name: name.trim() || room.players[seat]?.name });
            }}>
              <label htmlFor="pilot-name">Display name</label>
              <input id="pilot-name" value={name} maxLength={32} placeholder={room.players[seat]?.name}
                onChange={event => setName(event.target.value)} />
              <button disabled={busy}>Ready</button>
            </form>
          )}
          {!match && ready && <p role="status">Waiting for both seats to be ready.</p>}
          {match?.phase.kind === "finished" && (
            <p role="status">
              {match.phase.winner === null ? "Tie" : `${room.players[match.phase.winner]?.name} won`}
              {" · "}Scores: {match.phase.scores.join(" to ")}
            </p>
          )}
          {match && activeSeat !== null && (
            <section className="pilot__turn">
              <p role="status">
                Round {Math.floor(match.completedTurns / 2) + 1} of 10 · {activeSeat === seat
                  ? "Your turn" : `${room.players[activeSeat]?.name}'s turn`}
              </p>
              {match.lastRoll !== null && <p>Last roll: {match.lastRoll}</p>}
              {choice && <p>{choice.name} · ${choice.price}</p>}
              {seat === activeSeat && match.phase.kind === "roll" && (
                <button disabled={busy} onClick={() => turn("roll")}>Roll</button>
              )}
              {seat === activeSeat && choice && (
                <div className="pilot__controls">
                  <button disabled={busy || (choice.price ?? Infinity) > match.players[seat].cash}
                    onClick={() => turn("buy")}>Buy</button>
                  <button disabled={busy} onClick={() => turn("pass")}>Pass</button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
