import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { DAILY_GOALS_CHANGED, getDailyGoalWindow } from "../lib/dailyGoals";
import { getNetWorth } from "../data/tradingState";
import { useGame } from "../context/GameContext";
import { supabase } from "../lib/supabase";

export type DailyGoal = {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  href: string;
  actionLabel: string;
  progress: number; // 0–100
  done: boolean;
};

type MeasureCtx = { watchlistCount: number; holdingCount: number; cash: number; netWorth: number; buys: number; sells: number };
type GoalDef = Pick<DailyGoal, "id" | "title" | "description" | "href" | "actionLabel"> & { measure: (ctx: MeasureCtx) => { current: number; target: number } };
const GOAL_POOL: GoalDef[] = [
  { id: "watch2", title: "Build a watchlist", description: "Keep two stocks on your watchlist. No purchase needed.", href: "/game", actionLabel: "Watch stocks", measure: c => ({ current: c.watchlistCount, target: 2 }) },
  { id: "buy1", title: "Buy a share", description: "Buy at least one share today. Any company counts.", href: "/game", actionLabel: "Open market", measure: c => ({ current: c.buys, target: 1 }) },
  { id: "sell1", title: "Sell a share", description: "Sell at least one share today from your portfolio.", href: "/game", actionLabel: "Open portfolio", measure: c => ({ current: c.sells, target: 1 }) },
  { id: "hold2", title: "Hold two companies", description: "Own shares in two different companies at the same time.", href: "/game", actionLabel: "Open market", measure: c => ({ current: c.holdingCount, target: 2 }) },
  { id: "cash20", title: "Keep a cash buffer", description: "Keep at least 20% of your net worth in cash. Holding cash counts.", href: "/dashboard", actionLabel: "View account", measure: c => ({ current: c.netWorth > 0 ? Math.floor(c.cash / c.netWorth * 100) : 0, target: 20 }) },
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

// Rotate one slot each calendar day; reloads and game-day advances keep the same set.
export function selectGoals(userId: string, date: string): GoalDef[] {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  const offset = (hash(userId) + day) % GOAL_POOL.length;
  return Array.from({ length: GOALS_PER_DAY }, (_, i) => GOAL_POOL[(offset + i) % GOAL_POOL.length]);
}

export function useDailyGoals() {
  const { user } = useAuth();
  const { watchlistSymbols, gameDay, sessionId, account, stocks, loading, advancing } = useGame();
  const [goalWindow, setGoalWindow] = useState(getDailyGoalWindow);
  const { date, startAt, refreshAt } = goalWindow;
  useEffect(() => {
    const update = () => setGoalWindow(current => {
      const next = getDailyGoalWindow();
      return current.date === next.date ? current : next;
    });
    const timer = window.setTimeout(update, Math.max(0, Date.parse(refreshAt) - Date.now()) + 10);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refreshAt]);
  const scope = `${user?.id}:${sessionId}:${gameDay}:${date}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [completed, setCompleted] = useState<{ scope: string; ids: Set<string>; buys: number; sells: number }>({ scope: "", ids: new Set(), buys: 0, sells: 0 });
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const attempted = useRef(new Set<string>());
  const reached = useRef(new Set<string>());
  const completedIds = useMemo(() => completed.scope === scope ? completed.ids : new Set<string>(), [completed, scope]);
  useEffect(() => { attempted.current.clear(); reached.current.clear(); setPersistenceError(null); }, [scope]);
  useEffect(() => {
    if (!user || !sessionId || loading || advancing) return;
    let cancelled = false;
    void (async () => {
      try {
        const [markers, trades] = await Promise.all([
          supabase.from("user_daily_goal_completions").select("goal_id")
            .eq("user_id", user.id).eq("session_id", sessionId).eq("goal_date", date),
          supabase.from("trades").select("trade_type, quantity")
            .eq("session_id", sessionId).gte("executed_at", startAt).lt("executed_at", refreshAt),
        ]);
        if (cancelled) return;
        if (markers.error || trades.error) throw markers.error || trades.error;
        const quantity = (side: string) => (trades.data ?? []).filter(t => t.trade_type === side).reduce((sum, t) => sum + Number(t.quantity), 0);
        setCompleted(current => ({ scope,
          ids: new Set([...(current.scope === scope ? current.ids : []), ...(markers.data ?? []).map(g => g.goal_id)]),
          buys: quantity("buy"), sells: quantity("sell"),
        }));
        setPersistenceError(null);
      } catch {
        if (!cancelled) setPersistenceError("Daily goals could not be loaded. Try again.");
      }
    })();
    return () => { cancelled = true; };
  }, [user, sessionId, scope, date, startAt, refreshAt, account, loading, advancing, retry]);

  const goals = useMemo<DailyGoal[]>(() => {
    const ctx: MeasureCtx = {
      watchlistCount: watchlistSymbols.length,
      holdingCount: account.holdings.filter(h => h.shares > 0).length,
      cash: account.cash, netWorth: getNetWorth(account, stocks),
      buys: completed.scope === scope ? completed.buys : 0,
      sells: completed.scope === scope ? completed.sells : 0,
    };

    return selectGoals(user?.id ?? "guest", date).map((def) => {
      const { current, target } = def.measure(ctx);
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      return {
        id: def.id,
        title: def.title,
        href: def.href,
        actionLabel: def.actionLabel,
        description: def.description,
        current,
        target,
        progress: completedIds.has(def.id) ? 100 : progress,
        done: completedIds.has(def.id),
      };
    });
  }, [watchlistSymbols, account, stocks, completed, scope, date, user, completedIds]);

  useEffect(() => {
    if (!user || !sessionId || loading || advancing || completed.scope !== scope) return;
    goals.filter(g => g.current >= g.target).forEach(g => reached.current.add(g.id));
    const ids = [...reached.current].filter(id => !completedIds.has(id) && !attempted.current.has(id));
    if (!ids.length) return;
    ids.forEach(id => attempted.current.add(id));
    void (async () => {
      try {
        const { error } = await supabase.from("user_daily_goal_completions").upsert(
          ids.map(goal_id => ({ user_id: user.id, session_id: sessionId, game_day: gameDay, goal_date: date, goal_id })),
          { onConflict: "user_id,session_id,goal_date,goal_id", ignoreDuplicates: true });
        if (currentScope.current !== scope) return;
        if (error) throw error;
        setCompleted(current => current.scope === scope ? { ...current, ids: new Set([...current.ids, ...ids]) } : current);
        setPersistenceError(null);
        window.dispatchEvent(new Event(DAILY_GOALS_CHANGED));
      } catch {
        if (currentScope.current === scope) setPersistenceError("Daily goal progress could not be saved. Try again.");
      }
    })();
  }, [goals, completed.scope, completedIds, scope, user, sessionId, gameDay, date, loading, advancing, retry]);

  const retryPersistence = useCallback(() => {
    attempted.current.clear();
    setPersistenceError(null);
    setRetry(value => value + 1);
  }, []);
  return { goals, completedCount: goals.filter(g => g.done).length, persistenceError, retryPersistence, refreshAt, date };
}
