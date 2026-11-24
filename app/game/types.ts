export interface GameStats {
  money: number;
  properties_owned: number;
  total_revenue: number;
  total_property_value: number;
  achievements: string[];
  player_title: string;
  player_group: "vampires" | "humans" | "elves";
  timestamp: string;
}

export interface AggregatedStats {
  totalGames: number;
  avgMoney: number;
  avgTotalValue: number;
  avgPropertiesOwned: number;
  achievementCounts: Record<string, number>;
  titleCounts: Record<string, number>;
  groupCounts: Record<string, number>;
  groupStats: {
    vampires: GroupStats;
    humans: GroupStats;
    elves: GroupStats;
  };
}

export interface GroupStats {
  totalGames: number;
  avgMoney: number;
  avgTotalValue: number;
  avgPropertiesOwned: number;
  achievementCounts: Record<string, number>;
  titleCounts: Record<string, number>;
}
