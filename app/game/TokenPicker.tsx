import { useState, useEffect, useRef } from "react";

import { PLAYER_TOKENS, PlayerToken } from "./data";
import { factionDetails, isTokenUnlocked } from "./utils/tokenUnlocks";

import "./TokenPicker.css";

interface TokenPickerProps {
  onChoose: (token: PlayerToken, seeded: boolean) => void;
  checkingSave?: boolean;
  savedGame?: {
    turnCount: number;
    onResume: () => void;
    onStartNew: () => void;
  };
  invitation?: { token: PlayerToken; onStart: () => void; onDismiss: () => void };
  challengeError?: string;
}

export const TokenPicker = ({ onChoose, checkingSave, savedGame, invitation, challengeError }: TokenPickerProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const resumeRef = useRef<HTMLButtonElement>(null);

  const unlockedTokens = PLAYER_TOKENS.filter(
    token =>
      token.group === "humans" ||
      isTokenUnlocked(token.group as "vampires" | "elves")
  );

  useEffect(() => {
    setIsLoaded(true);

    const handleStorageChange = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener("token-picker-refresh", handleStorageChange);
    return () =>
      window.removeEventListener("token-picker-refresh", handleStorageChange);
  }, []);

  useEffect(() => {
    if (checkingSave) return;
    if (savedGame || invitation) {
      resumeRef.current?.focus();
      return;
    }
    if (isLoaded && unlockedTokens.length > 0) {
      const firstUnlockedIndex = PLAYER_TOKENS.findIndex(
        token => unlockedTokens[0].id === token.id
      );
      if (firstUnlockedIndex !== -1 && buttonRefs.current[firstUnlockedIndex]) {
        buttonRefs.current[firstUnlockedIndex]?.focus();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, refreshKey, checkingSave, savedGame, invitation]);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    tokenIndex: number
  ) => {
    if (e.key === "Enter") {
      const isUnlocked =
        PLAYER_TOKENS[tokenIndex].group === "humans" ||
        isTokenUnlocked(
          PLAYER_TOKENS[tokenIndex].group as "vampires" | "elves"
        );
      if (isUnlocked) {
        e.preventDefault();
        const token = PLAYER_TOKENS[tokenIndex];
        setSelected(token.id);
        setTimeout(() => onChoose(token, seeded), 180);
      }
      return;
    }

    if (
      e.key !== "ArrowRight" &&
      e.key !== "ArrowLeft" &&
      e.key !== "ArrowDown" &&
      e.key !== "ArrowUp"
    ) {
      return;
    }

    e.preventDefault();

    const currentRow = Math.floor(tokenIndex / 3);
    const currentCol = tokenIndex % 3;
    let targetRow = currentRow;
    let targetCol = currentCol;

    if (e.key === "ArrowRight") {
      targetCol = (currentCol + 1) % 3;
    } else if (e.key === "ArrowLeft") {
      targetCol = (currentCol - 1 + 3) % 3;
    } else if (e.key === "ArrowDown") {
      targetRow = currentRow + 1;
      if (targetRow * 3 + currentCol >= PLAYER_TOKENS.length) {
        targetRow = 0;
      }
    } else if (e.key === "ArrowUp") {
      targetRow = currentRow - 1;
      if (targetRow < 0) {
        targetRow = Math.floor((PLAYER_TOKENS.length - 1) / 3);
      }
    }

    const targetIndex = targetRow * 3 + targetCol;

    if (targetIndex >= PLAYER_TOKENS.length) {
      return;
    }

    const targetToken = PLAYER_TOKENS[targetIndex];
    const isTargetUnlocked =
      targetToken.group === "humans" ||
      isTokenUnlocked(targetToken.group as "vampires" | "elves");

    if (isTargetUnlocked && buttonRefs.current[targetIndex]) {
      buttonRefs.current[targetIndex]?.focus();
    } else if (!isTargetUnlocked) {
      let searchIndex = targetIndex;
      const searchDirection =
        e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      const maxSearch = PLAYER_TOKENS.length;

      for (let i = 0; i < maxSearch; i++) {
        searchIndex =
          (searchIndex + searchDirection + PLAYER_TOKENS.length) %
          PLAYER_TOKENS.length;

        if (
          (e.key === "ArrowRight" || e.key === "ArrowLeft") &&
          Math.floor(searchIndex / 3) !== targetRow
        ) {
          break;
        }

        if (
          (e.key === "ArrowDown" || e.key === "ArrowUp") &&
          searchIndex % 3 !== targetCol
        ) {
          break;
        }

        const searchToken = PLAYER_TOKENS[searchIndex];
        const isSearchUnlocked =
          searchToken.group === "humans" ||
          isTokenUnlocked(searchToken.group as "vampires" | "elves");

        if (isSearchUnlocked && buttonRefs.current[searchIndex]) {
          buttonRefs.current[searchIndex]?.focus();
          return;
        }
      }
    }
  };

  if (!isLoaded || checkingSave) {
    return (
      <div className="token-picker" role="dialog" aria-modal="true">
        <div className="token-picker__content">
          <h2 className="token-picker__title">Choose Your Token</h2>
          <div className="token-picker__loading">
            <div className="token-picker__loading-spinner">👻</div>
            <p>Loading tokens...</p>
          </div>
        </div>
      </div>
    );
  }

  if (invitation) {
    return (
      <div className="token-picker" role="dialog" aria-modal="true" aria-labelledby="challenge-title">
        <div className="token-picker__content">
          <h2 id="challenge-title" className="token-picker__title">Seeded challenge</h2>
          <p className="token-picker__hint">Play as a {factionDetails[invitation.token.group].name} using the shared seed.</p>
          {savedGame && <p className="token-picker__hint">Starting this challenge replaces your current save.</p>}
          <div className="token-picker__saved-actions">
            <button type="button" ref={resumeRef} onClick={invitation.onStart}>Play challenge</button>
            <button type="button" onClick={invitation.onDismiss}>Decline challenge</button>
          </div>
        </div>
      </div>
    );
  }

  if (savedGame) {
    return (
      <div className="token-picker" role="dialog" aria-modal="true" aria-labelledby="saved-game-title">
        <div className="token-picker__content">
          <h2 id="saved-game-title" className="token-picker__title">Saved game</h2>
          {challengeError && <p className="token-picker__hint" role="status">{challengeError}</p>}
          <p className="token-picker__hint">Turn {savedGame.turnCount} is saved in this browser.</p>
          <div className="token-picker__saved-actions">
            <button type="button" ref={resumeRef} onClick={savedGame.onResume}>Resume</button>
            <button type="button" onClick={savedGame.onStartNew}>Start new</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="token-picker" role="dialog" aria-modal="true" aria-labelledby="token-picker-title">
      <div className="token-picker__content">
        <h2 id="token-picker-title" className="token-picker__title">Choose Your Token</h2>
        {challengeError && <p className="token-picker__hint" role="status">{challengeError}</p>}
        <label className="token-picker__seed-option">
          <input type="checkbox" checked={seeded} onChange={event => setSeeded(event.target.checked)} />
          Create a shareable challenge
        </label>
        <a className="token-picker__pilot" href="/multiplayer">Play with a friend</a>

        <div className="token-picker__grid" key={refreshKey}>
          {PLAYER_TOKENS.map((token, index) => {
            const isUnlocked =
              token.group === "humans" ||
              isTokenUnlocked(token.group as "vampires" | "elves");
            const isLocked = !isUnlocked;
            const faction = factionDetails[token.group];

            return (
              <button
                key={token.id}
                ref={el => {
                  buttonRefs.current[index] = el;
                }}
                className={`token-picker__option ${selected === token.id ? "token-picker__option--selected" : ""} ${isLocked ? "token-picker__option--locked" : ""}`}
                onClick={() => {
                  if (isLocked) return;
                  setSelected(token.id);
                  setTimeout(() => onChoose(token, seeded), 180);
                }}
                onKeyDown={e => handleKeyDown(e, index)}
                aria-label={`${isLocked ? "Locked " : "Choose "}${faction.name} token ${index % 3 + 1}`}
                aria-describedby={isUnlocked ? `token-rules-${token.group}` : undefined}
                disabled={isLocked}
              >
                <img className="token-picker__portrait" src={`/tokens/${token.id}.webp`} alt="" width={72} height={72} />
                <span>{faction.name}</span>
                {isLocked && <span className="token-picker__lock-info">Locked</span>}
              </button>
            );
          })}
        </div>

        {Object.entries(factionDetails)
          .filter(([group]) => unlockedTokens.some(token => token.group === group))
          .map(([group, faction]) => (
            <p id={`token-rules-${group}`} className="token-picker__hint" key={group}>
              <strong>{faction.name}</strong> {faction.rule}
            </p>
          ))}
      </div>
    </div>
  );
};
