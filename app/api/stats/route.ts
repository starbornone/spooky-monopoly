import { NextResponse } from "next/server";

import { getStatsDatabase } from "../stats-database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getStatsDatabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Global statistics are unavailable", code: "STATS_UNCONFIGURED" },
        { status: 503 }
      );
    }

    const { data, error } = await supabase
      .from("wwo_2025_spooky_game_stats")
      .select(
        "money, properties_owned, total_property_value, achievements, player_title, player_group"
      );

    if (error) {
      console.error("Error fetching global stats:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalGames: 0,
          avgMoney: 0,
          avgTotalValue: 0,
          avgPropertiesOwned: 0,
          achievementCounts: {},
          titleCounts: {},
          groupCounts: {},
          groupStats: {
            vampires: {
              totalGames: 0,
              avgMoney: 0,
              avgTotalValue: 0,
              avgPropertiesOwned: 0,
              achievementCounts: {},
              titleCounts: {},
            },
            humans: {
              totalGames: 0,
              avgMoney: 0,
              avgTotalValue: 0,
              avgPropertiesOwned: 0,
              achievementCounts: {},
              titleCounts: {},
            },
            elves: {
              totalGames: 0,
              avgMoney: 0,
              avgTotalValue: 0,
              avgPropertiesOwned: 0,
              achievementCounts: {},
              titleCounts: {},
            },
          },
        },
      });
    }

    const totalGames = data.length;
    const totalMoney = data.reduce((sum, game) => sum + game.money, 0);
    const totalPropertyValue = data.reduce(
      (sum, game) => sum + (game.total_property_value || 0),
      0
    );
    const totalProperties = data.reduce(
      (sum, game) => sum + game.properties_owned,
      0
    );

    const achievementCounts: Record<string, number> = {};
    const titleCounts: Record<string, number> = {};
    const groupCounts: Record<string, number> = {};

    const groupStats = {
      vampires: {
        totalGames: 0,
        avgMoney: 0,
        avgTotalValue: 0,
        avgPropertiesOwned: 0,
        achievementCounts: {} as Record<string, number>,
        titleCounts: {} as Record<string, number>,
      },
      humans: {
        totalGames: 0,
        avgMoney: 0,
        avgTotalValue: 0,
        avgPropertiesOwned: 0,
        achievementCounts: {} as Record<string, number>,
        titleCounts: {} as Record<string, number>,
      },
      elves: {
        totalGames: 0,
        avgMoney: 0,
        avgTotalValue: 0,
        avgPropertiesOwned: 0,
        achievementCounts: {} as Record<string, number>,
        titleCounts: {} as Record<string, number>,
      },
    };

    data.forEach(game => {
      if (game.achievements && Array.isArray(game.achievements)) {
        game.achievements.forEach((achievement: string) => {
          achievementCounts[achievement] =
            (achievementCounts[achievement] || 0) + 1;
        });
      }

      if (game.player_title) {
        titleCounts[game.player_title] =
          (titleCounts[game.player_title] || 0) + 1;
      }

      const group = game.player_group || "humans";
      groupCounts[group] = (groupCounts[group] || 0) + 1;

      if (groupStats[group as keyof typeof groupStats]) {
        groupStats[group as keyof typeof groupStats].totalGames++;

        if (game.achievements && Array.isArray(game.achievements)) {
          game.achievements.forEach((achievement: string) => {
            groupStats[group as keyof typeof groupStats].achievementCounts[
              achievement
            ] =
              (groupStats[group as keyof typeof groupStats].achievementCounts[
                achievement
              ] || 0) + 1;
          });
        }

        if (game.player_title) {
          groupStats[group as keyof typeof groupStats].titleCounts[
            game.player_title
          ] =
            (groupStats[group as keyof typeof groupStats].titleCounts[
              game.player_title
            ] || 0) + 1;
        }
      }
    });

    Object.keys(groupStats).forEach(group => {
      const stats = groupStats[group as keyof typeof groupStats];
      if (stats.totalGames > 0) {
        const groupGames = data.filter(
          game => (game.player_group || "humans") === group
        );
        const groupMoney = groupGames.reduce(
          (sum, game) => sum + game.money,
          0
        );
        const groupPropertyValue = groupGames.reduce(
          (sum, game) => sum + (game.total_property_value || 0),
          0
        );
        const groupProperties = groupGames.reduce(
          (sum, game) => sum + game.properties_owned,
          0
        );

        stats.avgMoney = Math.round(groupMoney / stats.totalGames);
        stats.avgTotalValue = Math.round(
          (groupMoney + groupPropertyValue) / stats.totalGames
        );
        stats.avgPropertiesOwned =
          Math.round((groupProperties / stats.totalGames) * 10) / 10;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        totalGames,
        avgMoney: Math.round(totalMoney / totalGames),
        avgTotalValue: Math.round(
          (totalMoney + totalPropertyValue) / totalGames
        ),
        avgPropertiesOwned:
          Math.round((totalProperties / totalGames) * 10) / 10,
        achievementCounts,
        titleCounts,
        groupCounts,
        groupStats,
      },
    });
  } catch (err) {
    console.error("Exception fetching global stats:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
