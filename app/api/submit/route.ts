import { NextRequest, NextResponse } from "next/server";

import type { GameStats } from "../../game/types";
import { getStatsDatabase } from "../stats-database";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = getStatsDatabase();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Global statistics are unavailable" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const stats: Omit<GameStats, "timestamp"> = body;

    const { data, error } = await supabase
      .from("wwo_2025_spooky_game_stats")
      .insert([
        {
          ...stats,
          timestamp: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error("Error submitting game stats:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Exception submitting game stats:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
