"use client";

import { useEffect } from "react";

import { BoardSpace, PlayerToken } from "./data";
import {
  getMessage,
  getPlayerTitle,
  getReflectionText,
  getSpecialAchievements,
} from "./utils";
import { factionDetails, type UnlockStatus } from "./utils/tokenUnlocks";

import "./EndGame.css";

interface EndGameProps {
  money: number;
  ownedProperties: BoardSpace[];
  playerToken: PlayerToken | null;
  onRestart: () => void;
  earnedUnlocks: (keyof UnlockStatus)[];
}

export const EndGame = ({
  money,
  ownedProperties,
  playerToken,
  onRestart,
  earnedUnlocks,
}: EndGameProps) => {
  const totalRevenue = ownedProperties.reduce(
    (sum, prop) => sum + (prop.rent || 0),
    0
  );

  const totalPropertyValue = ownedProperties.reduce(
    (sum, prop) => sum + (prop.price || 0),
    0
  );

  const achievements = getSpecialAchievements(ownedProperties, money);
  const playerTitle = getPlayerTitle(ownedProperties);

  useEffect(() => {
    try {
      const payloadKey = JSON.stringify({
        money,
        properties: ownedProperties.length,
        revenue: totalRevenue,
        title: playerTitle,
        achievements: achievements.map(a => a.title).sort(),
      });

      const lastKey = sessionStorage.getItem("lastEndGameSubmission");
      const lastTsRaw = sessionStorage.getItem("lastEndGameSubmissionTs");
      const lastTs = lastTsRaw ? parseInt(lastTsRaw, 10) : 0;
      const now = Date.now();

      if (lastKey === payloadKey && now - lastTs < 2000) {
        return;
      }

      sessionStorage.setItem("lastEndGameSubmission", payloadKey);
      sessionStorage.setItem("lastEndGameSubmissionTs", String(now));

      void fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          achievements: achievements.map(a => a.title),
          money,
          player_group: playerToken?.group || "humans",
          player_title: playerTitle,
          properties_owned: ownedProperties.length,
          total_revenue: totalRevenue,
          total_property_value: totalPropertyValue,
        }),
      }).catch(error => {
        console.error("Error submitting game stats:", error);
      });
    } catch (e) {
      console.warn("Stats submission skipped due to storage error", e);
    }
  }, [
    achievements,
    money,
    ownedProperties.length,
    playerTitle,
    playerToken?.group,
    totalRevenue,
    totalPropertyValue,
  ]);

  return (
    <div className="end-game">
      <h1 className="end-game__title">{playerTitle}</h1>
      {earnedUnlocks.map(group => (
        <p key={group} className="end-game__section-text" role="status">
          {factionDetails[group].name} tokens unlocked. Choose one when you restart.
        </p>
      ))}

      <div className="end-game__stats">
        <div className="end-game__stat">
          <span className="end-game__stat-label">Spooky Bucks Hoarded:</span>
          <span className="end-game__stat-value">${money}</span>
        </div>
        <div className="end-game__stat">
          <span className="end-game__stat-label">Cultural Casualties:</span>
          <span className="end-game__stat-value">{ownedProperties.length}</span>
        </div>
        <div className="end-game__stat">
          <span className="end-game__stat-label">Exploitation Revenue:</span>
          <span className="end-game__stat-value">${totalRevenue}/turn</span>
        </div>
      </div>

      {achievements.length > 0 && (
        <div className="end-game__section">
          <h2 className="end-game__section-title">
            Dark Achievements Unlocked
          </h2>
          <ul className="end-game__section-list">
            {achievements.map((achievement, index) => (
              <li key={index} className="end-game__section-list-item">
                <strong>{achievement.title}:</strong> {achievement.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ownedProperties.length > 0 && (
        <div className="end-game__section">
          <h2 className="end-game__section-title">
            Your Empire of Cultural Erasure:
          </h2>
          <ul className="end-game__section-list">
            {ownedProperties.map(property => (
              <li key={property.id} className="end-game__section-list-item">
                💀 {property.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="end-game__section">
        <p className="end-game__section-text">
          {getMessage(money, ownedProperties)}
        </p>
        <p className="end-game__section-text">
          {getReflectionText(ownedProperties)}
        </p>
        <p className="end-game__section-text end-game__section-text--subdued">
          Remember: this isn&apos;t just a game. Every October, real
          corporations execute this exact strategy—transforming authentic
          cultural practices into profit opportunities, shipping plastic
          pumpkins across oceans, and convincing Australians they need
          Americanisms.
        </p>
        <p className="end-game__section-text end-game__section-text--subdued">
          Which, by the way, you might&apos;ve caught—we&apos;ve been using
          American English this whole time. Occupational hazard of empire.
        </p>
        <p className="end-game__section-text end-game__section-text--subdued">
          We didn&apos;t need supernatural powers to strip the soul from
          Halloween. Just good old-fashioned capitalism.
        </p>
        <p className="end-game__section-text end-game__section-text--subdued">
          Sweet dreams... are made of this.
        </p>
      </div>

      <button className="end-game__button" onClick={onRestart}>
        👻 Restart the Haunting Cycle 👻
      </button>
    </div>
  );
};
