"use client";

import { useState } from "react";
import { boardSpaces, MAX_TURNS, type BoardSpace, type PlayerToken } from "./data";
import { replaySoloTurns, type LedgerEntry, type RecordedTurn } from "./utils/ghostLedger";

import "./GhostLedger.css";

interface GhostLedgerProps {
  token: PlayerToken;
  turns: RecordedTurn[];
  money: number;
  ownedProperties: BoardSpace[];
}

const actionNames = { buy: "Buy", pass: "Pass", continue: "Continue" };
const spaceNames = new Map(boardSpaces.map(space => [space.id, space.name]));

function LedgerBalance({ entry }: { entry?: LedgerEntry }) {
  if (!entry) return <span>—</span>;
  return (
    <>
      <strong>${entry.money}</strong>
      <span className="ghost-ledger__properties">
        {entry.ownedProperties.map(id => spaceNames.get(id)).join(", ") || "No properties"}
      </span>
    </>
  );
}

export function GhostLedger({ token, turns, money, ownedProperties }: GhostLedgerProps) {
  const [selection, setSelection] = useState("");
  if (turns.length !== MAX_TURNS) return null;
  const original = replaySoloTurns(boardSpaces, token, turns);
  const final = original.entries.at(-1);
  if (original.stop || final?.money !== money ||
    final.ownedProperties.length !== ownedProperties.length ||
    ownedProperties.some(property => !final.ownedProperties.includes(property.id))) return null;

  const options = original.entries.flatMap(entry => entry.alternatives.map(choice => ({
    id: `${entry.turn}:${choice}`,
    turn: entry.turn,
    choice,
    label: `Turn ${entry.turn} · ${entry.space.name} · ${actionNames[choice]}`
  })));
  if (options.length === 0) return null;
  const change = options.find(option => option.id === selection);
  const alternate = change ? replaySoloTurns(boardSpaces, token, turns, change) : null;
  const stopped = alternate?.stop;

  return (
    <section className="ghost-ledger" aria-labelledby="ghost-ledger-title">
      <h2 id="ghost-ledger-title" className="end-game__section-title">Ghost Ledger</h2>
      <p>Replay the same rolls with one different choice. Your result stays the same.</p>
      <label htmlFor="ghost-ledger-turn">Alternate property choice</label>
      <select id="ghost-ledger-turn" value={selection} onChange={event => setSelection(event.target.value)}>
        <option value="">Choose a turn</option>
        {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      {stopped?.choice && (
        <p role="status">
          Replay stopped on turn {stopped.turn} at {stopped.space.name}.
          The recorded {actionNames[stopped.choice]} action is no longer legal.
        </p>
      )}
      {alternate && change && (
        <table>
          <caption>Cash and properties after each turn</caption>
          <thead>
            <tr><th scope="col">Turn</th><th scope="col">Original</th><th scope="col">Alternate</th></tr>
          </thead>
          <tbody>
            {original.entries.map((entry, index) => (
              <tr key={entry.turn} className={entry.turn === change.turn ? "ghost-ledger__changed" : undefined}>
                <th scope="row">{entry.turn}{entry.turn === change.turn && " (changed)"}</th>
                <td><LedgerBalance entry={entry} /></td>
                <td>{stopped?.turn === entry.turn ? "Stopped" : <LedgerBalance entry={alternate.entries[index]} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
