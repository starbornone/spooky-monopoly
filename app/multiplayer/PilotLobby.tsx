"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { boardSpaces } from "../game/data";
import { formatPropertyCount, ResultExport } from "../game/ResultShare";
import type { PilotMatch, PilotSeat } from "../server/multiplayer/pilotMatch";
import { PilotBoard } from "./PilotBoard";
import "./pilot.css";

interface SeatView {
  name: string;
  ready: boolean;
  presence: { away: boolean; graceSeconds: number };
}

interface RoomView {
  id: string;
  players: readonly [SeatView, SeatView | null];
  match: PilotMatch | null;
  closed: { reason: "left" | "timeout"; seat: PilotSeat } | null;
}

interface RoomReply {
  ok: boolean;
  code?: string;
  roomId?: string;
  invite?: string;
  seat?: PilotSeat;
  room?: RoomView;
  match?: PilotMatch;
}

const endpoint = "/api/multiplayer";
const messages: Record<string, string> = {
  "pilot-unavailable": "The private pilot is unavailable on this server.",
  "invite-unavailable": "This invitation has already been used or is invalid.",
  "invalid-invite": "This invitation is invalid.",
  "seat-required": "Open an invitation to join, or use the browser that already joined.",
  "stale-revision": "The match changed. Review the latest turn.",
  "wrong-seat": "It is the other player's turn.",
  "unaffordable": "You cannot afford this property.",
  "grace-period": "The other player is still connected or their grace period has not ended.",
  "room-closed": "This room has ended.",
  "match-finished": "The match has already finished."
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
  const [recovering, setRecovering] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const turnDock = useRef<HTMLElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (busy || recovering || !returnFocus.current) return;
    returnFocus.current = false;
    const dock = turnDock.current;
    (dock?.querySelector<HTMLElement>("button:enabled") ?? dock?.querySelector<HTMLElement>("[role='status']"))?.focus();
  }, [busy, recovering]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("room") ?? "";
    if (/^[0-9a-f]{32}$/.test(id)) setRoomId(id);
    setGuestInvite(new URLSearchParams(url.hash.slice(1)).get("invite") ?? "");
  }, []);

  const updateRoom = (reply: RoomReply) => {
    if (reply.seat !== undefined) setSeat(reply.seat);
    const next = reply.room;
    if (next) {
      setRoom(current =>
        current?.closed || (current?.match && (next.match?.revision ?? -1) < current.match.revision) ? current : next
      );
    } else if (reply.match) {
      const match = reply.match;
      setRoom(current => current && !current.closed && match.revision >= (current.match?.revision ?? -1)
        ? { ...current, match }
        : current);
    }
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
          setRecovering(false);
        }
        if (!cancelled && !reply.ok && !(reply.code === "seat-required" && guestInvite)) {
          setError(messages[reply.code ?? ""] ?? "Could not read the room.");
        }
      } catch {
        if (!cancelled) setRecovering(true);
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
      if (roomId) setRecovering(true);
      else setError("Connection interrupted. Try again.");
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
  const finished = match?.phase.kind === "finished" ? match.phase : null;
  const activeSeat = match && !room?.closed && match.phase.kind !== "finished"
    ? ((match.firstSeat + match.completedTurns) % 2) as PilotSeat
    : null;
  const ready = seat === null ? false : room?.players[seat]?.ready;
  const opponent = seat === null ? null : room?.players[seat === 0 ? 1 : 0];
  const canLeave = room && seat !== null && !room.closed && match?.phase.kind !== "finished";
  const controlsDisabled = busy || recovering;
  const choiceId = match?.phase.kind === "choice" ? match.phase.spaceId : undefined;
  const choice = boardSpaces.find(space => space.id === choiceId);
  const turn = (action: "roll" | "buy" | "pass") => {
    if (!match) return;
    returnFocus.current = true;
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
      {recovering && <p role="status">Connection interrupted. Waiting for the current room state.</p>}
      {!roomId && <button disabled={busy} onClick={create}>Create private room</button>}
      {roomId && seat === null && guestInvite && <button disabled={busy} onClick={join}>Join as guest</button>}
      {shareLink && !room?.closed && !finished && (
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
                <strong>{match && `P${index + 1} · `}{player?.name ?? "Guest seat open"}{seat === index ? " (you)" : ""}</strong>
                {match
                  ? <span>${match.players[index].cash} · {boardSpaces[match.players[index].position].name}</span>
                  : <span>{player?.ready ? "Ready" : "Waiting"}</span>}
                {player?.presence.away && seat !== index && !room.closed && match?.phase.kind !== "finished" && <span>Away</span>}
              </li>
            ))}
          </ul>
          {!room.closed && !match && seat !== null && !ready && (
            <form onSubmit={event => {
              event.preventDefault();
              void post(`${endpoint}/${roomId}`, { type: "ready", name: name.trim() || room.players[seat]?.name });
            }}>
              <label htmlFor="pilot-name">Display name</label>
              <input id="pilot-name" value={name} maxLength={32} placeholder={room.players[seat]?.name}
                onChange={event => setName(event.target.value)} />
              <button disabled={controlsDisabled}>Ready</button>
            </form>
          )}
          {!room.closed && !match && ready && <p role="status">Waiting for both seats to be ready.</p>}
          {room.closed && (
            <p role="status">
              {room.closed.reason === "left"
                ? `${room.closed.seat === seat ? "You left" : `${room.players[room.closed.seat ?? 0]?.name ?? "A player"} left`} the ${match ? "match" : "room"}.`
                : "The match was abandoned."}
              {match && " No result was recorded."}
            </p>
          )}
          {activeSeat !== null && opponent?.presence.away && (
            <section className="pilot__seat" aria-label="Opponent connection">
              {opponent.presence.graceSeconds > 0 ? (
                <p>{opponent.name} has {opponent.presence.graceSeconds} seconds to reconnect before you can end the match.</p>
              ) : (
                <button disabled={controlsDisabled}
                  onClick={() => void post(`${endpoint}/${roomId}`, { type: "abandon" })}>End abandoned match</button>
              )}
            </section>
          )}
          {canLeave && (
            <div className="pilot__controls">
              {confirmLeave ? (
                <>
                  <p>{match ? "Leaving ends this match without a result." : "Leaving closes this room."}</p>
                  <button disabled={controlsDisabled} onClick={() => void post(`${endpoint}/${roomId}`, { type: "leave" })}>Confirm leave</button>
                  <button onClick={() => setConfirmLeave(false)}>Stay</button>
                </>
              ) : (
                <button disabled={controlsDisabled} onClick={() => setConfirmLeave(true)}>{match ? "Leave match" : "Leave room"}</button>
              )}
            </div>
          )}
          {match && <PilotBoard match={match} players={room.players} activeSeat={activeSeat} />}
          {match && finished && !room.closed && (
            <MatchResult match={match} result={finished} players={room.players} />
          )}
          {match && activeSeat !== null && (
            <section className="pilot__turn" ref={turnDock} aria-label="Turn controls">
              <p role="status" tabIndex={-1}>
                Round {Math.floor(match.completedTurns / 2) + 1} of 10 · {activeSeat === seat
                  ? "Your turn" : `${room.players[activeSeat]?.name}'s turn`}
              </p>
              {match.lastRoll !== null && <p>Last roll: {match.lastRoll}</p>}
              {choice && <p>{choice.name} · ${choice.price} · Rent: ${choice.rent}</p>}
              {seat === activeSeat && match.phase.kind === "roll" && (
                <button disabled={controlsDisabled} onClick={() => turn("roll")}>Roll</button>
              )}
              {seat === activeSeat && choice && (
                <div className="pilot__controls">
                  <button disabled={controlsDisabled || (choice.price ?? Infinity) > match.players[seat].cash}
                    onClick={() => turn("buy")}>Buy</button>
                  <button disabled={controlsDisabled} onClick={() => turn("pass")}>Pass</button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

function MatchResult({ match, result, players }: {
  match: PilotMatch;
  result: Extract<PilotMatch["phase"], { kind: "finished" }>;
  players: RoomView["players"];
}) {
  const seats = [0, 1] as const;
  const labels = seats.map(seat => `P${seat + 1} · ${players[seat]?.name ?? "Player"}`);
  const outcome = result.winner === null ? "Tie" : `${labels[result.winner]} won`;
  const highlights = seats.map(seat => {
    const properties = Object.values(match.owners).filter(owner => owner === seat).length;
    return `${labels[seat]}: ${result.scores[seat]} points · $${match.players[seat].cash} cash · ${formatPropertyCount(properties)}`;
  });
  const rounds = `${match.completedTurns / 2} rounds played`;

  return (
    <section aria-label="Match result">
      <p role="status">{outcome}{" · "}Scores: {result.scores.join(" to ")}</p>
      <ResultExport title={outcome} kind="recap" filename="spooky-monopoly-match.png"
        summary={["Spooky Monopoly", outcome, ...highlights, rounds].join("\n")}
        imageRows={[...highlights, rounds].map(value => ({
          value, font: "24px sans-serif", tone: "text-muted", spacing: 38
        }))} />
    </section>
  );
}
