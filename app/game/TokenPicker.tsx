import { useState, useEffect, useRef } from "react";

import { PLAYER_TOKENS, PlayerToken } from "./data";
import { isTokenUnlocked } from "./utils/tokenUnlocks";

import "./TokenPicker.css";

interface TokenPickerProps {
  onChoose: (token: PlayerToken) => void;
}

export const TokenPicker = ({ onChoose }: TokenPickerProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
    if (isLoaded && unlockedTokens.length > 0) {
      const firstUnlockedIndex = PLAYER_TOKENS.findIndex(
        token => unlockedTokens[0].icon === token.icon
      );
      if (firstUnlockedIndex !== -1 && buttonRefs.current[firstUnlockedIndex]) {
        buttonRefs.current[firstUnlockedIndex]?.focus();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, refreshKey]);

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
        setSelected(token.icon);
        setTimeout(() => onChoose(token), 180);
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

  if (!isLoaded) {
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

  return (
    <div className="token-picker" role="dialog" aria-modal="true">
      <div className="token-picker__content">
        <h2 className="token-picker__title">Choose Your Token</h2>

        <div className="token-picker__grid" key={refreshKey}>
          {PLAYER_TOKENS.map((token, index) => {
            const isUnlocked =
              token.group === "humans" ||
              isTokenUnlocked(token.group as "vampires" | "elves");
            const isLocked = !isUnlocked;

            return (
              <button
                key={token.icon}
                ref={el => {
                  buttonRefs.current[index] = el;
                }}
                className={`token-picker__option ${selected === token.icon ? "token-picker__option--selected" : ""} ${isLocked ? "token-picker__option--locked" : ""}`}
                onClick={() => {
                  if (isLocked) return;
                  setSelected(token.icon);
                  setTimeout(() => onChoose(token), 180);
                }}
                onKeyDown={e => handleKeyDown(e, index)}
                aria-label={`Choose token ${token.icon}`}
                disabled={isLocked}
              >
                <span className="token-picker__emoji">{token.icon}</span>
                {isLocked ? (
                  <span className="token-picker__lock-info">🔒 Locked</span>
                ) : (
                  <span className="token-picker__abilities">
                    {token.canBuyProperties
                      ? !token.canResistBuyingProperties
                        ? "🫰🤑🫰"
                        : "💰🏠"
                      : "🚫💰🏠"}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="token-picker__hint">
          Pick who you are in this haunting. Your choices determine what you can
          and cannot do.
        </p>
      </div>
    </div>
  );
};
