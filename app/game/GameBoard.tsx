"use client";

import { useState, useRef, useEffect } from "react";

import { boardSpaces, MAX_TURNS, PLAYER_TOKENS, type PlayerToken } from "./data";
import { EndGame } from "./EndGame";
import { GameSidebar } from "./GameSidebar";
import { PropertyPopup } from "./PropertyPopup";
import { TokenPicker } from "./TokenPicker";
import { clearLocalRun, readLocalRun, writeLocalRun, type LocalRun } from "./utils/localRun";
import { recordEarnedUnlocks, type PurchaseBehavior, type UnlockStatus } from "./utils/tokenUnlocks";

import "./GameBoard.css";

export default function GameBoard() {
  const [gameEnded, setGameEnded] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [animatePlayer, setAnimatePlayer] = useState(false);
  const [money, setMoney] = useState(0);
  const [ownedProperties, setOwnedProperties] = useState<number[]>([]);
  const [playerPosition, setPlayerPosition] = useState(0);
  const [playerToken, setPlayerToken] = useState<PlayerToken | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [savedRun, setSavedRun] = useState<LocalRun | null | undefined>(undefined);
  const [gameLog, setGameLog] = useState<{ message: string; id: number }[]>([]);
  const logIdCounter = useRef(0);
  const [earnedUnlocks, setEarnedUnlocks] = useState<(keyof UnlockStatus)[]>([]);
  const [purchaseBehavior, setPurchaseBehavior] = useState<PurchaseBehavior>({
    totalPropertiesLandedOn: 0,
    totalPropertiesBought: 0,
    totalAffordablePropertiesLandedOn: 0,
  });

  useEffect(() => {
    setSavedRun(readLocalRun());
  }, []);

  useEffect(() => {
    if (!playerToken || isRolling || gameEnded) return;
    writeLocalRun({
      tokenId: playerToken.id,
      spaceId: boardSpaces[playerPosition].id,
      turnCount,
      money,
      ownedProperties,
      showPopup,
      purchaseBehavior,
      gameLog
    });
  }, [playerToken, isRolling, gameEnded, playerPosition, turnCount, money, ownedProperties, showPopup, purchaseBehavior, gameLog]);

  const resumeRun = (run: LocalRun) => {
    const token = PLAYER_TOKENS.find(item => item.id === run.tokenId);
    const position = boardSpaces.findIndex(space => space.id === run.spaceId);
    if (!token || position === -1) return;

    setPlayerToken(token);
    setPlayerPosition(position);
    setTurnCount(run.turnCount);
    setMoney(run.money);
    setOwnedProperties(run.ownedProperties);
    setShowPopup(run.showPopup);
    setPurchaseBehavior(run.purchaseBehavior);
    setGameLog(run.gameLog);
    logIdCounter.current = run.gameLog.reduce((max, entry) => Math.max(max, entry.id), 0);
    setSavedRun(null);
  };

  const addToLog = (message: string) => {
    const id = ++logIdCounter.current;
    setGameLog(prev => [...prev, { message, id }]);
  };

  const rollDice = () => {
    if (isRolling || showPopup || turnCount >= MAX_TURNS) return;
    setIsRolling(true);
    let roll = Math.floor(Math.random() * 6) + 1;

    // Vampire bias: favor landing on unowned properties for acquisition
    if (playerToken?.group === "vampires") {
      const unownedPropertySpaces = boardSpaces
        .map((space, index) => ({ space, index }))
        .filter(
          ({ space, index }) =>
            space.type === "property" &&
            !ownedProperties.includes(space.id) &&
            index !== playerPosition
        );

      if (unownedPropertySpaces.length > 0) {
        // 65% chance to bias toward unowned properties
        if (Math.random() < 0.8) {
          const targetSpace =
            unownedPropertySpaces[
              Math.floor(Math.random() * unownedPropertySpaces.length)
            ];
          const distance =
            (targetSpace.index - playerPosition + boardSpaces.length) %
            boardSpaces.length;
          if (distance >= 1 && distance <= 6) {
            roll = distance;
          }
        }
      }
    }

    setTimeout(() => {
      const newPosition = (playerPosition + roll) % boardSpaces.length;
      let passIncome = 0;

      // Calculate pass-through income (vampires get extra from owned properties)
      // Include the final destination property in rent collection
      for (let i = 1; i <= roll; i++) {
        const idx = (playerPosition + i) % boardSpaces.length;
        const s = boardSpaces[idx];
        if (s.type === "property" && ownedProperties.includes(s.id) && s.rent) {
          const baseRent = s.rent;
          const vampireBonus = playerToken?.group === "vampires" ? 1 : 0.75;
          const rentAmount = Math.floor(baseRent * vampireBonus);
          passIncome += rentAmount;
        }
      }

      // Calculate effective money after all bonuses/penalties for affordability check
      let effectiveMoney = money + passIncome;

      if (passIncome > 0) {
        setMoney(prev => prev + passIncome);
        if (playerToken?.group === "vampires") {
          addToLog(
            `💀 Drained blood money from owned properties: $${passIncome}`
          );
        } else {
          addToLog(`🫰 Collected rent from owned properties: $${passIncome}`);
        }
      }

      // Handle passing GO with ideological bonuses
      if (newPosition < playerPosition) {
        const goBonus = getGoBonus();
        effectiveMoney += goBonus;

        setMoney(prev => prev + goBonus);

        if (playerToken?.group === "vampires") {
          addToLog(
            `💀 Vampiric GO bonus: $${goBonus} (exploitation efficiency!)`
          );
        } else if (playerToken?.group === "elves") {
          addToLog(
            `🌱 Minimal GO stipend: $${goBonus} (refusing excessive wealth)`
          );
        } else {
          addToLog(`💼 Standard GO bonus: $${goBonus}`);
        }
      }

      setPlayerPosition(newPosition);
      setAnimatePlayer(true);
      setTimeout(() => setAnimatePlayer(false), 700);

      const landedSpace = boardSpaces[newPosition];

      // Handle special spaces
      if (landedSpace.type === "special") {
        const specialAdjustment = handleSpecialSpaceForTracking(landedSpace);
        effectiveMoney += specialAdjustment;
        handleSpecialSpace(landedSpace);
      }

      // Handle landing on properties
      if (landedSpace.type === "property") {
        // Calculate property landing adjustments for affordability
        let propertyLandingAdjustment = 0;
        if (!ownedProperties.includes(landedSpace.id)) {
          if (playerToken?.group === "elves") {
            const ethicalTax = Math.floor((landedSpace.rent || 0) * 0.75);
            propertyLandingAdjustment = -ethicalTax;
          } else if (playerToken?.group === "vampires") {
            propertyLandingAdjustment = 25; // survey bonus
          }
        }
        effectiveMoney = Math.max(
          0,
          effectiveMoney + propertyLandingAdjustment
        );

        // Track property landings for unlock system (only count unowned properties)
        if (!ownedProperties.includes(landedSpace.id)) {
          const isAffordable = landedSpace.price
            ? effectiveMoney >= landedSpace.price
            : false;
          setPurchaseBehavior(prev => ({
            ...prev,
            totalPropertiesLandedOn: prev.totalPropertiesLandedOn + 1,
            totalAffordablePropertiesLandedOn: isAffordable
              ? prev.totalAffordablePropertiesLandedOn + 1
              : prev.totalAffordablePropertiesLandedOn,
          }));
        }
        handlePropertyLanding(landedSpace);
      }

      const newTurnCount = turnCount + 1;
      setTurnCount(newTurnCount);
      setShowPopup(true);


      setIsRolling(false);
    }, 500);
  };

  const getGoBonus = (): number => {
    switch (playerToken?.group) {
      case "vampires":
        return 200; // Extra exploitation bonus
      case "elves":
        return 50; // Refusing excessive wealth
      case "humans":
      default:
        return 100; // Standard amount
    }
  };

  const handleSpecialSpaceForTracking = (
    space: (typeof boardSpaces)[0]
  ): number => {
    if (space.id === 0) {
      return getGoBonus();
    } else if (space.id === 8) {
      // Cultural Imperialism Station
      return playerToken?.group === "vampires"
        ? 200
        : playerToken?.group === "elves"
          ? 50
          : 100;
    } else if (space.id === 12 || space.id === 15) {
      // Capitalism special spaces
      return playerToken?.group === "vampires"
        ? 100
        : playerToken?.group === "elves"
          ? -50
          : 0;
    }
    return 0;
  };

  const handleSpecialSpace = (space: (typeof boardSpaces)[0]) => {
    if (space.id === 0) {
      const goBonus = getGoBonus();
      setMoney(prev => prev + goBonus);
    } else if (space.id === 8) {
      // Cultural Imperialism Station
      const bonus =
        playerToken?.group === "vampires"
          ? 200
          : playerToken?.group === "elves"
            ? 50
            : 100;
      setMoney(prev => prev + bonus);

      if (playerToken?.group === "vampires") {
        addToLog(
          `💀 Cultural imperialism bonus: $${bonus} (spreading the plague!)`
        );
      } else if (playerToken?.group === "elves") {
        addToLog(
          `🌱 Reluctant imperialism payment: $${bonus} (this hurts my soul)`
        );
      }
    } else if (space.id === 12 || space.id === 15) {
      // Capitalism special spaces
      // Vampires get bonus, Elves get penalty, Humans get standard
      const adjustment =
        playerToken?.group === "vampires"
          ? 100
          : playerToken?.group === "elves"
            ? -50
            : 0;

      if (adjustment !== 0) {
        setMoney(prev => Math.max(0, prev + adjustment));
        if (adjustment > 0) {
          addToLog(
            `💀 Capitalism bonus: $${adjustment} (feeding off the system!)`
          );
        } else {
          addToLog(
            `🌱 Capitalism penalty: $${Math.abs(adjustment)} (refusing to profit from suffering)`
          );
        }
      }
    }
  };

  const handlePropertyLanding = (space: (typeof boardSpaces)[0]) => {
    // Rent collection is handled in the pass-through logic above
    // This function handles special bonuses/penalties for landing on properties

    if (ownedProperties.includes(space.id)) {
      // Landing on own property - vampires get additional bonus beyond rent
      if (playerToken?.group === "vampires") {
        const bonus = Math.floor((space.rent || 0) * 0.25);
        if (bonus > 0) {
          setMoney(prev => prev + bonus);
          addToLog(
            `💀 Self-exploitation bonus: $${bonus} (even bleeding yourself pays!)`
          );
        }
      }
    } else {
      // Landing on unowned property - special bonuses/penalties
      if (playerToken?.group === "elves") {
        // Elves pay "ethical tax" when landing on exploitative properties
        const ethicalTax = Math.floor((space.rent || 0) * 0.75);
        if (ethicalTax > 0) {
          setMoney(prev => Math.max(0, prev - ethicalTax));
          addToLog(
            `🌱 Ethical burden: -$${ethicalTax} (guilt tax for existing in this system)`
          );
        }
      } else if (playerToken?.group === "vampires") {
        // Vampires get small bonus for "surveying" unowned exploitation opportunities
        const surveyBonus = 25;
        setMoney(prev => prev + surveyBonus);
        addToLog(
          `💀 Opportunity assessment: +$${surveyBonus} (smelling fresh blood!)`
        );
      }
    }
  };

  const handlePurchase = (spaceId: number, price: number) => {
    if (money >= price) {
      const space = boardSpaces.find(s => s.id === spaceId);
      if (!space) return;

      let bonus = 0;

      if (playerToken?.group === "vampires") {
        bonus = Math.floor(price * 0.2); // 20% "exploitation efficiency" bonus
        setMoney(money - price + bonus);
        addToLog(`💀 Exploitation efficiency bonus: +$${bonus}`);
        addToLog(`💀 Purchased ${space.name} for $${price}`);
      } else {
        setMoney(money - price);
        addToLog(`💰 Purchased ${space.name} for $${price}`);
      }

      setOwnedProperties([...ownedProperties, spaceId]);
      setPurchaseBehavior(prev => ({
        ...prev,
        totalPropertiesBought: prev.totalPropertiesBought + 1,
      }));
      setShowPopup(false);
    }
  };

  const currentSpace = boardSpaces[playerPosition];
  const isOwned = ownedProperties.includes(currentSpace.id);

  const handleRestart = () => {
    clearLocalRun();
    setGameEnded(false);
    setEarnedUnlocks([]);
    setMoney(1500);
    setOwnedProperties([]);
    setPlayerPosition(0);
    setPlayerToken(null);
    setTurnCount(0);
    setGameLog([]);
    logIdCounter.current = 0;
    setPurchaseBehavior({
      totalPropertiesLandedOn: 0,
      totalPropertiesBought: 0,
      totalAffordablePropertiesLandedOn: 0,
    });
  };

  if (gameEnded) {
    return (
      <div className="game-board game-board--ended">
        <GameSidebar
          canRoll={!!playerToken}
          currentSpace={currentSpace}
          isEnded={gameEnded}
          isRolling={isRolling}
          money={money}
          ownedProperties={ownedProperties}
          rollDice={rollDice}
          showPopup={showPopup}
          turnCount={turnCount}
        />
        <div className="game-board__container">
          <EndGame
            money={money}
            ownedProperties={ownedProperties.map(
              id => boardSpaces.find(s => s.id === id)!
            )}
            playerToken={playerToken}
            onRestart={handleRestart}
            earnedUnlocks={earnedUnlocks}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="game-board">
      <GameSidebar
        canEndGame={turnCount >= MAX_TURNS}
        canRoll={!!playerToken}
        currentSpace={currentSpace}
        isRolling={isRolling}
        money={money}
        onEndGame={() => {
          clearLocalRun();
          setEarnedUnlocks(recordEarnedUnlocks(purchaseBehavior));
          setGameEnded(true);
        }}
        ownedProperties={ownedProperties}
        rollDice={rollDice}
        showPopup={showPopup}
        turnCount={turnCount}
      />

      <div className="game-board__container">
        <div className="game-board__spaces">
          {boardSpaces.map((space, index) => (
            <div
              key={space.id}
              className={`game-board__space ${
                playerPosition === index ? "game-board__space--active" : ""
              } ${
                space.type === "special" ? "game-board__space--special" : ""
              } ${
                ownedProperties.includes(space.id)
                  ? "game-board__space--owned"
                  : ""
              }`}
            >
              <div className="game-board__space-name">{space.name}</div>
              {ownedProperties.includes(space.id) && <span className="game-board__space-status">Owned</span>}
              {playerToken && playerPosition === index && <span className="game-board__space-status">You</span>}
              {ownedProperties.includes(space.id) && (
                <div className="game-board__space-owner">
                  {playerToken?.group === "vampires"
                    ? "💀"
                    : playerToken?.group === "elves"
                      ? "🌱"
                      : "💰"}
                </div>
              )}
              {playerPosition === index && (
                <div
                  className={`game-board__player ${animatePlayer ? "game-board__player--move" : ""}`}
                >
                  {playerToken?.icon ?? ""}
                </div>
              )}
            </div>
          ))}

          <details className="game-board__log">
            <summary>Turn log</summary>
            {[...gameLog]
              .reverse()
              .map(logEntry => (
                <div key={logEntry.id} className="game-board__log-message">
                  {logEntry.message}
                </div>
              ))}
          </details>
        </div>
      </div>

      {showPopup && (
        <PropertyPopup
          isOwned={isOwned}
          canBuyProperties={playerToken?.canBuyProperties ?? false}
          canResistBuyingProperties={
            playerToken?.canResistBuyingProperties ?? false
          }
          money={money}
          onClose={() => setShowPopup(false)}
          onPurchase={handlePurchase}
          space={currentSpace}
          playerToken={playerToken}
        />
      )}

      {!playerToken && (
        <TokenPicker
          checkingSave={savedRun === undefined}
          savedGame={savedRun ? {
            turnCount: savedRun.turnCount,
            onResume: () => resumeRun(savedRun),
            onStartNew: () => {
              clearLocalRun();
              setSavedRun(null);
            }
          } : undefined}
          onChoose={token => {
            setMoney(token.startingMoney);
            setPlayerToken(token);
          }}
        />
      )}
    </div>
  );
}
