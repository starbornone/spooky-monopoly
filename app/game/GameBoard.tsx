"use client";

import { useCallback, useState, useRef, useEffect } from "react";

import { boardSpaces, MAX_TURNS, PLAYER_TOKENS, type PlayerToken } from "./data";
import { EndGame } from "./EndGame";
import { Artwork, IllustratedLabel } from "./Artwork";
import { GameSidebar } from "./GameSidebar";
import { PropertyPopup } from "./PropertyPopup";
import { TokenPicker } from "./TokenPicker";
import { challengeVersion, formatChallenge, randomForChallengeTurn, readChallenge, type Challenge } from "./utils/challenge";
import { getPropertyActions } from "./utils/getPropertyActions";
import type { RecordedTurn, TurnChoice } from "./utils/ghostLedger";
import { clearLocalRun, readLocalRun, writeLocalRun, type LocalRun } from "./utils/localRun";
import { buySoloProperty, chooseSoloRoll, resolveSoloLanding } from "./utils/soloRules";
import { recordEarnedUnlocks, type PurchaseBehavior, type UnlockStatus } from "./utils/tokenUnlocks";

import "./GameBoard.css";

const ownershipArtwork = { vampires: "skull", elves: "seedling", humans: "coin-purse" } as const;

export default function GameBoard() {
  const [gameEnded, setGameEnded] = useState(false);
  const [statsConfirmed, setStatsConfirmed] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [animatePlayer, setAnimatePlayer] = useState(false);
  const [money, setMoney] = useState(0);
  const [ownedProperties, setOwnedProperties] = useState<number[]>([]);
  const [playerPosition, setPlayerPosition] = useState(0);
  const [playerToken, setPlayerToken] = useState<PlayerToken | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [savedRun, setSavedRun] = useState<LocalRun | null | undefined>(undefined);
  const [invitation, setInvitation] = useState<Challenge | null>(null);
  const [challengeSeed, setChallengeSeed] = useState<number | undefined>(undefined);
  const [recordedTurns, setRecordedTurns] = useState<RecordedTurn[] | undefined>([]);
  const [gameLog, setGameLog] = useState<{ message: string; id: number }[]>([]);
  const logIdCounter = useRef(0);
  const [earnedUnlocks, setEarnedUnlocks] = useState<(keyof UnlockStatus)[]>([]);
  const [purchaseBehavior, setPurchaseBehavior] = useState<PurchaseBehavior>({
    totalPropertiesLandedOn: 0,
    totalPropertiesBought: 0,
    totalAffordablePropertiesLandedOn: 0,
  });
  const confirmStats = useCallback(() => setStatsConfirmed(true), []);

  useEffect(() => {
    setSavedRun(readLocalRun());
    const challenge = new URLSearchParams(window.location.search).get("challenge");
    if (challenge !== null) setInvitation(readChallenge(challenge, PLAYER_TOKENS.map(token => token.id)));
  }, []);

  useEffect(() => {
    if (!playerToken || isRolling || gameEnded) return;
    writeLocalRun({
      tokenId: playerToken.id,
      challenge: challengeSeed === undefined ? undefined : { seed: challengeSeed, rules: challengeVersion },
      spaceId: boardSpaces[playerPosition].id,
      turnCount,
      money,
      ownedProperties,
      showPopup,
      purchaseBehavior,
      gameLog,
      turns: recordedTurns
    });
  }, [playerToken, challengeSeed, isRolling, gameEnded, playerPosition, turnCount, money, ownedProperties, showPopup, purchaseBehavior, gameLog, recordedTurns]);

  const dismissInvitation = () => {
    if (!invitation) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("challenge");
    window.history.replaceState(window.history.state, "", url);
    setInvitation(null);
  };

  const startRun = (token: PlayerToken, seed?: number) => {
    dismissInvitation();
    setSavedRun(null);
    setChallengeSeed(seed);
    setRecordedTurns([]);
    setMoney(token.startingMoney);
    setPlayerToken(token);
  };

  const resumeRun = (run: LocalRun) => {
    const token = PLAYER_TOKENS.find(item => item.id === run.tokenId);
    const position = boardSpaces.findIndex(space => space.id === run.spaceId);
    if (!token || position === -1) return;

    setPlayerToken(token);
    setChallengeSeed(run.challenge?.seed);
    setRecordedTurns(run.turns);
    dismissInvitation();
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

  const soloPosition = { position: playerPosition, money, ownedProperties };

  const rollDice = () => {
    if (!playerToken || isRolling || showPopup || turnCount >= MAX_TURNS) return;
    setIsRolling(true);
    const random = challengeSeed === undefined ? Math.random : randomForChallengeTurn(challengeSeed, turnCount);
    const roll = chooseSoloRoll(boardSpaces, playerPosition, ownedProperties, playerToken.group, random);

    setTimeout(() => {
      const landed = resolveSoloLanding(boardSpaces, soloPosition, playerToken.group, roll);
      setPlayerPosition(landed.position);
      setMoney(landed.money);
      landed.logs.forEach(addToLog);
      if (landed.unowned) {
        setPurchaseBehavior(prev => ({
          ...prev,
          totalPropertiesLandedOn: prev.totalPropertiesLandedOn + 1,
          totalAffordablePropertiesLandedOn: prev.totalAffordablePropertiesLandedOn + Number(landed.affordable)
        }));
      }
      setTurnCount(turnCount + 1);
      setRecordedTurns(turns => turns && [...turns, { roll, choice: null }]);
      setShowPopup(true);
      setAnimatePlayer(true);
      setIsRolling(false);
      setTimeout(() => setAnimatePlayer(false), 700);
    }, 500);
  };

  const finishLanding = (choice: TurnChoice) => {
    setRecordedTurns(turns => turns?.map((turn, index) => index === turns.length - 1 ? { ...turn, choice } : turn));
    setShowPopup(false);
  };

  const handlePurchase = () => {
    if (!playerToken || !showPopup) return;
    const purchase = buySoloProperty(boardSpaces[playerPosition], soloPosition, playerToken);
    if (!purchase) return;
    setMoney(purchase.money);
    setOwnedProperties(purchase.ownedProperties);
    purchase.logs.forEach(addToLog);
    setPurchaseBehavior(prev => ({ ...prev, totalPropertiesBought: prev.totalPropertiesBought + 1 }));
    finishLanding("buy");
  };

  const currentSpace = boardSpaces[playerPosition];
  const isOwned = ownedProperties.includes(currentSpace.id);
  const invitedToken = invitation?.status === "ready"
    ? PLAYER_TOKENS.find(token => token.id === invitation.tokenId)
    : undefined;

  const handleRestart = () => {
    clearLocalRun();
    setGameEnded(false);
    setStatsConfirmed(false);
    setEarnedUnlocks([]);
    setChallengeSeed(undefined);
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
          statsConfirmed={statsConfirmed}
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
            onStatsConfirmed={confirmStats}
            earnedUnlocks={earnedUnlocks}
            recordedTurns={recordedTurns}
            challengeLink={playerToken && challengeSeed !== undefined
              ? `/?challenge=${formatChallenge(playerToken.id, challengeSeed)}`
              : undefined}
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
                <Artwork className="game-board__space-owner" name={ownershipArtwork[playerToken?.group ?? "humans"]} />
              )}
              {playerToken && playerPosition === index && (
                <img
                  className={`game-board__player ${animatePlayer ? "game-board__player--move" : ""}`}
                  src={`/tokens/${playerToken.id}.webp`}
                  alt=""
                  width={32}
                  height={32}
                />
              )}
            </div>
          ))}

          <details className="game-board__log" open>
            <summary>Turn log</summary>
            {[...gameLog]
              .reverse()
              .map(logEntry => (
                <div key={logEntry.id} className="game-board__log-message">
                  <IllustratedLabel value={logEntry.message} />
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
          onClose={() => {
            if (!playerToken) return;
            const actions = getPropertyActions({
              ...playerToken,
              isUnownedProperty: currentSpace.type === "property" && !isOwned,
              price: currentSpace.price,
              money
            });
            if (actions.canPass) finishLanding("pass");
            else if (actions.canContinue) finishLanding("continue");
          }}
          onPurchase={handlePurchase}
          space={currentSpace}
          playerToken={playerToken}
        />
      )}

      {!playerToken && (
        <TokenPicker
          checkingSave={savedRun === undefined}
          invitation={invitedToken && invitation?.status === "ready" ? {
            token: invitedToken,
            onStart: () => startRun(invitedToken, invitation.seed),
            onDismiss: dismissInvitation
          } : undefined}
          challengeError={invitation?.status === "unsupported"
            ? "This challenge uses an unsupported rules version."
            : invitation?.status === "invalid" ? "This challenge link is invalid." : undefined}
          savedGame={savedRun ? {
            turnCount: savedRun.turnCount,
            onResume: () => resumeRun(savedRun),
            onStartNew: () => {
              clearLocalRun();
              setSavedRun(null);
            }
          } : undefined}
          onChoose={(token, seeded) => startRun(token, seeded ? crypto.getRandomValues(new Uint32Array(1))[0] : undefined)}
        />
      )}
    </div>
  );
}
