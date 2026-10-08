import { supabase } from "./supabase";

// Base URL of the StockPilot API server. Same convention Profile.tsx already uses.
const API_BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:5000";
// Reads with a direct-Supabase fallback stay snappy. Market calls have no
// fallback -- only the server may generate a run's market or move its day --
// and catching up a long run can take a few seconds, so they get longer.
const REQUEST_TIMEOUT_MS = 3000;
const MARKET_TIMEOUT_MS = 45_000;

/** The API server could not be reached, or refused the request. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number | null) {
    super(message);
    this.name = "ApiError";
  }
}

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

async function authedFetch(path: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, signal: controller.signal });
    } catch {
      throw new ApiError("The StockPilot game server could not be reached. Check your connection and try again.", null);
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(typeof json?.message === "string" ? json.message : `API ${path} failed: ${res.status}`, res.status);
    }
    return json;
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

/**
 * Refresh the session's stored net worth. The server computes it from stored
 * prices; nothing the client reports is written.
 */
export async function syncGameState(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc("sync_session_value", { target_session_id: sessionId });
  if (error) throw error;
}

/** Generate any missing market days up to the run's current day. */
export async function ensureSessionMarket(sessionId: string): Promise<{
  currentDay: number;
  generatedThrough: number;
  netWorth: number | string | null;
}> {
  return authedFetch("/api/game/market", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  }, MARKET_TIMEOUT_MS);
}

export type AdvanceResult = {
  day: number;
  cash: number | string;
  net_worth: number | string;
  cycles_charged: number;
  bill_total: number | string;
  amount_paid: number | string;
  shortfall: number | string;
  /** Older API servers don't send it. */
  unpaid_bills?: number | string;
};

/** Move the run forward to `day` (the server generates that market first). */
export async function advanceSessionDay(sessionId: string, day: number): Promise<AdvanceResult> {
  return authedFetch("/api/game/advance", {
    method: "POST",
    body: JSON.stringify({ sessionId, day }),
  }, MARKET_TIMEOUT_MS);
}
