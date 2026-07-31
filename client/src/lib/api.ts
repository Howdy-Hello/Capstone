import { supabase } from "./supabase";

// Base URL of the StockPilot API server. Same convention Profile.tsx already uses.
const API_BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:5000";
// Keep server calls snappy so we fall back to direct Supabase quickly when the
// API server isn't running (e.g. the static GitHub Pages deployment).
const REQUEST_TIMEOUT_MS = 3000;

export type LeaderboardRow = {
  user_id: string;
  best_net_worth: number | string;
  return_pct: number | string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number | string;
};

export type GameMode = "infinite" | "limited_30";

async function authedFetch(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, signal: controller.signal });
    if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Read the ranked leaderboard. Server first, direct Supabase RPC as fallback. */
export async function fetchLeaderboard(limit = 50): Promise<LeaderboardRow[]> {
  try {
    const json = await authedFetch(`/api/leaderboard?limit=${limit}`, { method: "GET" });
    if (Array.isArray(json?.leaderboard)) return json.leaderboard as LeaderboardRow[];
  } catch {
    /* fall through to direct Supabase */
  }
  const { data, error } = await supabase.rpc("get_leaderboard", { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}

/** Record a score update. Infinite mode stores current net worth; 30-day keeps a best finish. */
export async function submitLeaderboardScore(params: {
  netWorth: number;
  gameMode?: GameMode;
  day?: number | null;
}): Promise<void> {
  const payload = {
    netWorth: params.netWorth,
    gameMode: params.gameMode ?? "infinite",
    day: params.day ?? null,
  };
  try {
    await authedFetch("/api/leaderboard/submit", { method: "POST", body: JSON.stringify(payload) });
    return;
  } catch {
    /* fall through to direct RPC */
  }
  try {
    await supabase.rpc("record_leaderboard_score", {
      p_net_worth: payload.netWorth,
      p_game_mode: payload.gameMode,
      p_day: payload.day,
    });
  } catch {
    /* leaderboard is non-critical to gameplay — swallow */
  }
}

/**
 * Persist a session's value and record the leaderboard score. Server first;
 * on failure, writes directly to Supabase so the app works without the server.
 * Throws only if the direct-fallback session write itself fails.
 */
export async function syncGameState(params: {
  sessionId: string;
  portfolioValue: number;
  netWorth: number;
  gameMode?: GameMode;
  day?: number | null;
}): Promise<void> {
  const body = {
    sessionId: params.sessionId,
    portfolioValue: params.portfolioValue,
    netWorth: params.netWorth,
    gameMode: params.gameMode ?? "infinite",
    day: params.day ?? null,
  };
  try {
    await authedFetch("/api/game/sync", { method: "POST", body: JSON.stringify(body) });
    return;
  } catch {
    /* fall through to direct Supabase writes */
  }

  const { error } = await supabase
    .from("game_sessions")
    .update({
      portfolio_value: Number(params.portfolioValue.toFixed(2)),
      net_worth: Number(params.netWorth.toFixed(2)),
    })
    .eq("id", params.sessionId);
  if (error) throw error;

  await submitLeaderboardScore({
    netWorth: params.netWorth,
    gameMode: params.gameMode,
    day: params.day,
  });
}
