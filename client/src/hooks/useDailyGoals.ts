import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { getPortfolioValue } from "../data/tradingState";
import { supabase } from "../lib/supabase";

export type DailyGoal = {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  progress: number; // 0–100
  done: boolean;
  rewardXp: number;
};

type MeasureCtx = {
  holdingsCount: number;
  distinctSectors: number;
  highRiskOwned: number;
  netWorth: number;
  cash: number;
  watchlistCount: number;
};

type GoalDef = {
  id: string;
  title: string;
  description: string;
  rewardXp: number;
  measure: (ctx: MeasureCtx) => { current: number; target: number };
};

const GOAL_POOL: GoalDef[] = [
  { id: "hold3", title: "Diversify", description: "Hold shares in 3 different companies.", rewardXp: 60,
    measure: (c) => ({ current: c.holdingsCount, target: 3 }) },
  { id: "networth", title: "Grow the account", description: "Reach a net worth of $2,500.", rewardXp: 80,
    measure: (c) => ({ current: Math.round(c.netWorth), target: 2500 }) },
  { id: "cash20", title: "Keep dry powder", description: "Keep at least 20% of net worth in cash.", rewardXp: 50,
    measure: (c) => ({ current: c.netWorth > 0 ? Math.round((c.cash / c.netWorth) * 100) : 0, target: 20 }) },
  { id: "watch2", title: "Build a watchlist", description: "Track 2 stocks on your watchlist.", rewardXp: 40,
    measure: (c) => ({ current: c.watchlistCount, target: 2 }) },
  { id: "highrisk", title: "Take a swing", description: "Own at least one High-risk stock.", rewardXp: 55,
    measure: (c) => ({ current: Math.min(1, c.highRiskOwned), target: 1 }) },
  { id: "sectors2", title: "Spread the risk", description: "Hold stocks across 2 different sectors.", rewardXp: 65,
    measure: (c) => ({ current: c.distinctSectors, target: 2 }) },
];

const GOALS_PER_DAY = 3;

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Deterministic per (user, day, seed) so the same goals persist across reloads.
function selectGoals(userId: string, gameDay: number, marketSeed: string): GoalDef[] {
  const seed = `${userId}:${gameDay}:${marketSeed}`;
  return [...GOAL_POOL]
    .map((goal) => ({ goal, key: hash(`${seed}:${goal.id}`) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, GOALS_PER_DAY)
    .map((entry) => entry.goal);
}

function storageKey(userId: string, gameDay: number) {
  return `stockpilot-daily-goals-${userId}-${gameDay}`;
}

function loadCompleted(userId: string, gameDay: number): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId, gameDay));
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveCompleted(userId: string, gameDay: number, completed: Set<string>) {
  try {
    localStorage.setItem(storageKey(userId, gameDay), JSON.stringify([...completed]));
  } catch {
    /* ignore */
  }
}

export function useDailyGoals() {
  const { user } = useAuth();
  const { account, stocks, watchlistSymbols, gameDay, marketSeed } = useGame();

  const netWorth = useMemo(
    () => account.cash + getPortfolioValue(account, stocks),
    [account, stocks]
  );

  // Once a goal is hit it stays complete for the day, even if the player later
  // sells down. Persisted per (user, day).
  //
  // Tagged with the day it belongs to. On a day rollover the load effect and
  // the persist effect run in the same flush, and the persist effect (declared
  // later, so it runs second) used to read the PREVIOUS day's set while gameDay
  // had already advanced -- writing yesterday's completions into today's
  // localStorage key and Supabase rows, and clobbering the load effect's reset.
  // Comparing the tag makes the persist effect a no-op until the two agree.
  const [completed, setCompleted] = useState<{ day: number; ids: Set<string> }>(
    { day: -1, ids: new Set() }
  );
  const completedIds = completed.ids;

  // Local cache loads instantly; Supabase is merged in once it resolves so
  // progress follows the player across devices without blocking the UI.
  useEffect(() => {
    if (!user) { setCompleted({ day: gameDay, ids: new Set() }); return; }
    const local = loadCompleted(user.id, gameDay);
    setCompleted({ day: gameDay, ids: local });

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_daily_goal_completions")
        .select("goal_id")
        .eq("user_id", user.id)
        .eq("game_day", gameDay);
      if (cancelled || error || !data) return;
      const merged = new Set(local);
      data.forEach((row: { goal_id: string }) => merged.add(row.goal_id));
      if (merged.size !== local.size) {
        setCompleted({ day: gameDay, ids: merged });
        saveCompleted(user.id, gameDay, merged);
      }
    })();

    return () => { cancelled = true; };
  }, [user, gameDay]);

  const goals = useMemo<DailyGoal[]>(() => {
    const bySymbol = new Map(stocks.map((stock) => [stock.symbol, stock]));
    const owned = account.holdings.map((h) => bySymbol.get(h.symbol)).filter(Boolean) as typeof stocks;

    const ctx: MeasureCtx = {
      holdingsCount: account.holdings.length,
      distinctSectors: new Set(owned.map((stock) => stock.sector)).size,
      highRiskOwned: owned.filter((stock) => stock.riskLevel === "High").length,
      netWorth,
      cash: account.cash,
      watchlistCount: watchlistSymbols.length,
    };

    return selectGoals(user?.id ?? "guest", gameDay, marketSeed).map((def) => {
      const { current, target } = def.measure(ctx);
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        current,
        target,
        progress,
        done: completedIds.has(def.id) || progress >= 100,
        rewardXp: def.rewardXp,
      };
    });
  }, [account, stocks, watchlistSymbols, netWorth, gameDay, marketSeed, user, completedIds]);

  useEffect(() => {
    if (!user) return;
    // The loaded set still belongs to the previous day; wait for the load
    // effect to catch up rather than persisting it under the new day's key.
    if (completed.day !== gameDay) return;

    const newlyDone = goals.filter((g) => g.progress >= 100 && !completed.ids.has(g.id));
    if (newlyDone.length === 0) return;

    const next = new Set(completed.ids);
    newlyDone.forEach((g) => next.add(g.id));
    setCompleted({ day: gameDay, ids: next });
    saveCompleted(user.id, gameDay, next);

    // Best-effort sync — daily goals are non-critical to gameplay, so a
    // failed write here shouldn't surface an error to the player.
    void supabase
      .from("user_daily_goal_completions")
      .upsert(
        newlyDone.map((g) => ({ user_id: user.id, game_day: gameDay, goal_id: g.id })),
        { onConflict: "user_id,game_day,goal_id", ignoreDuplicates: true },
      )
      .then(() => {});
  }, [goals, completed, user, gameDay]);

  const completedCount = goals.filter((g) => g.done).length;
  const totalXp = goals.filter((g) => g.done).reduce((sum, g) => sum + g.rewardXp, 0);

  return { goals, completedCount, totalXp };
}
