"use client";

import { useEffect, useState } from "react";

import { loadGlobalStats, type GlobalStatsState } from "./utils/loadGlobalStats";

import "./GlobalStats.css";

export const GlobalStats = () => {
  const [state, setState] = useState<GlobalStatsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [activeTab, setActiveTab] = useState<
    "all" | "vampires" | "humans" | "elves"
  >("all");

  useEffect(() => {
    const controller = new AbortController();
    loadGlobalStats(controller.signal).then(result => {
      if (!controller.signal.aborted) setState(result);
    });
    return () => controller.abort();
  }, [attempt]);

  if (state.status !== "ready") {
    const messages = {
      loading: "Loading global stats…",
      unconfigured: "Shared statistics are not configured for this game.",
      empty: "No games have been recorded yet.",
      error: "Unable to load shared statistics."
    };

    return (
      <div className="global-stats">
        <h2 className="global-stats__title">Global Statistics</h2>
        <p className="global-stats__status" role="status">{messages[state.status]}</p>
        {state.status === "error" && (
          <button
            className="global-stats__tab"
            onClick={() => {
              setState({ status: "loading" });
              setAttempt(previous => previous + 1);
            }}
          >
            Retry shared statistics
          </button>
        )}
      </div>
    );
  }

  const stats = state.data;
  const currentStats = activeTab === "all" ? stats : stats.groupStats[activeTab];
  const achievements = Object.entries(currentStats.achievementCounts).sort(
    ([, a], [, b]) => b - a
  );
  const titles = Object.entries(currentStats.titleCounts).sort(
    ([, a], [, b]) => b - a
  );

  const groupLabels = {
    all: "All",
    vampires: "🧛",
    humans: "👩‍💼",
    elves: "🧝",
  };

  return (
    <div className="global-stats">
      <h2 className="global-stats__title">Global Statistics</h2>

      <div className="global-stats__tabs">
        {Object.entries(groupLabels).map(([key, label]) => (
          <button
            key={key}
            aria-pressed={activeTab === key}
            className={`global-stats__tab ${activeTab === key ? "global-stats__tab--active" : ""}`}
            onClick={() => setActiveTab(key as typeof activeTab)}
          >
            {label}
          </button>
        ))}
      </div>

      {currentStats.totalGames === 0 && <p className="global-stats__status">No games recorded for this group.</p>}

      <div className="global-stats__section">
        <div className="global-stats__stat">
          Total Games:{" "}
          <span className="global-stats__value">{currentStats.totalGames}</span>
        </div>
        <div className="global-stats__stat">
          Avg. Total Value:{" "}
          <span className="global-stats__value">
            ${currentStats.avgTotalValue}
          </span>
        </div>
        <div className="global-stats__stat">
          Avg. Properties:{" "}
          <span className="global-stats__value">
            {currentStats.avgPropertiesOwned}
          </span>
        </div>
      </div>

      <div className="global-stats__section">
        <h3 className="global-stats__subtitle">Titles</h3>
        <ul className="global-stats__list">
          {titles.map(([title, count]) => (
            <li key={title} className="global-stats__list-item">
              <span className="global-stats__list-count">{count}</span> &#215;{" "}
              <span className="global-stats__list-name">{title.slice(2)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="global-stats__section">
        <h3 className="global-stats__subtitle">Achievements</h3>
        <ul className="global-stats__list">
          {achievements.map(([achievement, count]) => (
            <li key={achievement} className="global-stats__list-item">
              <span className="global-stats__list-count">{count}</span> &#215;{" "}
              <span className="global-stats__list-name">
                {achievement.slice(2)}
                {achievement.slice(0, 2)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
