import type { AggregatedStats } from "../types";

export type GlobalStatsState =
  | { status: "loading" | "unconfigured" | "empty" | "error" }
  | { status: "ready"; data: AggregatedStats };

export async function loadGlobalStats(signal?: AbortSignal): Promise<GlobalStatsState> {
  try {
    const response = await fetch("/api/stats", { signal });
    const result = await response.json();

    if (response.status === 503 && result.code === "STATS_UNCONFIGURED") {
      return { status: "unconfigured" };
    }

    if (!response.ok || !result.success || typeof result.data?.totalGames !== "number") {
      return { status: "error" };
    }

    if (result.data.totalGames === 0) return { status: "empty" };
    return { status: "ready", data: result.data };
  } catch {
    return { status: "error" };
  }
}
