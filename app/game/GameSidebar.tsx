import { useEffect, useRef } from "react";
import { GameInfo } from "./GameInfo";
import { GameIntro } from "./GameIntro";
import { MoneyDisplay } from "./MoneyDisplay";
import { boardSpaces } from "./data";

import "./GameSidebar.css";
import { GlobalStats } from "./GlobalStats";

interface GameSidebarProps {
  canEndGame?: boolean;
  canRoll: boolean;
  currentSpace: (typeof boardSpaces)[number];
  isEnded?: boolean;
  isRolling: boolean;
  money: number;
  onEndGame?: () => void;
  ownedProperties: number[];
  rollDice: () => void;
  showPopup?: boolean;
  turnCount: number;
}

export const GameSidebar = ({
  canEndGame = false,
  canRoll,
  currentSpace,
  isEnded = false,
  isRolling,
  money,
  onEndGame,
  ownedProperties,
  rollDice,
  showPopup = false,
  turnCount,
}: GameSidebarProps) => {
  const diceButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (
      !isEnded &&
      !showPopup &&
      !isRolling &&
      canRoll &&
      diceButtonRef.current
    ) {
      diceButtonRef.current.focus();
    }
  }, [isEnded, showPopup, isRolling, canRoll]);

  return (
    <div className={`game-sidebar${isEnded ? " game-sidebar--ended" : ""}`}>
      <div className="game-sidebar__desktop-intro"><GameIntro /></div>
      <details className="game-sidebar__mobile-intro">
        <summary>About this game</summary>
        <GameIntro />
      </details>

      {!isEnded && (
        <details className="game-sidebar__portfolio">
          <summary>Properties and cash</summary>
          <MoneyDisplay
            money={money}
            ownedProperties={ownedProperties.map(id => boardSpaces.find(s => s.id === id)!)}
          />
        </details>
      )}

      {!isEnded && (
        <div className="game-sidebar__center">
          <GameInfo turnCount={turnCount} currentSpace={currentSpace} />
          <span className="game-sidebar__mobile-balance">Cash: ${money}</span>

          <button
            className={`game-sidebar__dice ${isRolling ? "game-sidebar__dice--rolling" : ""}`}
            disabled={isRolling || !canRoll || showPopup}
            onClick={canEndGame ? (onEndGame ?? (() => {})) : rollDice}
            ref={diceButtonRef}
          >
            {!canRoll ? (
              "Pick your token to start"
            ) : isRolling ? (
              <>
                <span className="game-sidebar__dice-emoji">🎲</span> Rolling...
              </>
            ) : canEndGame ? (
              <>
                <span className="game-sidebar__dice-emoji">👻</span> End Game
              </>
            ) : (
              <>
                <span className="game-sidebar__dice-emoji">🎲</span> Roll Dice
              </>
            )}
          </button>
        </div>
      )}

      {isEnded && <GlobalStats />}
    </div>
  );
};
