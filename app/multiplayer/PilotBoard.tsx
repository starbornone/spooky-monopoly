"use client";

import { useRef, useState } from "react";
import { boardSpaces } from "../game/data";
import type { PilotMatch, PilotSeat } from "../server/multiplayer/pilotMatch";
import "./pilot-board.css";

const tileNames = [
  "GO", "Pumpkin", "Nostalgia", "Fashion", "Seasonal", "Authenticity", "Corporate",
  "Hallmark", "Station", "Sugar", "Petroleum", "Tradition", "Final Boss", "Scarcity",
  "Influencer", "Complete"
];

interface PilotBoardProps {
  match: PilotMatch;
  players: readonly [{ name: string }, { name: string } | null];
  activeSeat: PilotSeat | null;
}

export function PilotBoard({ match, players, activeSeat }: PilotBoardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const focusDetails = useRef<HTMLHeadingElement | null>(null);
  const selectedSpace = selected === null ? null : boardSpaces[selected];
  const seats = [0, 1] as const;

  return (
    <section className="pilot-board" aria-label="Shared board">
      <ol className="pilot-board__spaces" role="list">
        {boardSpaces.map((space, position) => {
          const owner = match.owners[space.id];
          const occupants = seats.filter(seat => match.players[seat].position === position);
          const active = activeSeat !== null && occupants.includes(activeSeat);
          return (
            <li className="pilot-board__space" key={space.id}>
              <button
                type="button"
                className={`pilot-board__tile${active ? " pilot-board__tile--active" : ""}`}
                aria-label={`${space.name}${owner === undefined ? "" : `, owned by ${players[owner]?.name}`}${occupants.map(seat => `, ${players[seat]?.name} is here`).join("")}`}
                aria-pressed={selected === position}
                onClick={event => {
                  trigger.current = event.currentTarget;
                  setSelected(position);
                  requestAnimationFrame(() => focusDetails.current?.focus());
                }}
              >
                <span>{tileNames[space.id] ?? space.name}</span>
                {owner !== undefined && <span className="pilot-board__owner">P{owner + 1} owns</span>}
                {occupants.length > 0 && (
                  <span className="pilot-board__tokens">
                    {occupants.map(seat => (
                      <span className="pilot-board__token" aria-hidden="true" key={seat}>P{seat + 1}</span>
                    ))}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="pilot-board__centre">
        {selectedSpace ? (
          <div aria-label="Space details" role="region">
            <h2 tabIndex={-1} ref={focusDetails}>{selectedSpace.name}</h2>
            {selectedSpace.type === "property" && (
              <p>Price: ${selectedSpace.price} · Rent: ${selectedSpace.rent}</p>
            )}
            <button type="button" onClick={() => {
              setSelected(null);
              trigger.current?.focus();
            }}>Close details</button>
          </div>
        ) : (
          <div className="pilot-board__legend">
            {seats.map(seat => <p key={seat}><strong>P{seat + 1}</strong> {players[seat]?.name}</p>)}
          </div>
        )}
      </div>
    </section>
  );
}
