"use client";

import { useEffect, useState } from "react";

import { AggregatedStats, GroupStats } from "./types";

import "./GlobalStats.css";

export const GlobalStats = () => {
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "all" | "vampires" | "humans" | "elves"
  >("all");

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/stats");
        const result = await response.json();
        if (result.success && result.data) {
          setStats(result.data);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="global-stats">
        <h2 className="global-stats__title">Global Statistics</h2>
        <p className="global-stats__loading">Loading global stats...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="global-stats">
        <h2 className="global-stats__title">Global Statistics</h2>
        <p className="global-stats__error">Unable to load stats</p>
      </div>
    );
  }

  const getCurrentStats = (): GroupStats & { totalGames: number } => {
    if (activeTab === "all") {
      return {
        totalGames: stats.totalGames,
        avgMoney: stats.avgMoney,
        avgTotalValue: stats.avgTotalValue,
        avgPropertiesOwned: stats.avgPropertiesOwned,
        achievementCounts: stats.achievementCounts,
        titleCounts: stats.titleCounts,
      };
    }
    return {
      totalGames: stats.groupStats[activeTab].totalGames,
      avgMoney: stats.groupStats[activeTab].avgMoney,
      avgTotalValue: stats.groupStats[activeTab].avgTotalValue,
      avgPropertiesOwned: stats.groupStats[activeTab].avgPropertiesOwned,
      achievementCounts: stats.groupStats[activeTab].achievementCounts,
      titleCounts: stats.groupStats[activeTab].titleCounts,
    };
  };

  const currentStats = getCurrentStats();
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
            className={`global-stats__tab ${activeTab === key ? "global-stats__tab--active" : ""}`}
            onClick={() => setActiveTab(key as typeof activeTab)}
          >
            {label}
          </button>
        ))}
      </div>

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
