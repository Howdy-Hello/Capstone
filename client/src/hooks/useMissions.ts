import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { supabase } from "../lib/supabase";
import { pushNotification } from "../lib/notifications";
import { addInboxMessage } from "../lib/inbox";

export type Mission = {
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
  tradeCount: number;
  holdingsCount: number;
  watchlistCount: number;
  alertCount: number;
  goalCompletionCount: number;
  gameDay: number;
};

type MissionDef = {
  id: string;
  title: string;
  description: string;
  rewardXp: number;
  measure: (ctx: MeasureCtx) => { current: number; target: number };
};

const DEFS: MissionDef[] = [
  { id: "first_trade", title: "Make your first trade", description: "Buy or sell any stock.", rewardXp: 40,
    measure: (c) => ({ current: c.tradeCount, target: 1 }) },
  { id: "build_watchlist", title: "Start a watchlist", description: "Add a stock to your watchlist.", rewardXp: 25,
    measure: (c) => ({ current: c.watchlistCount, target: 1 }) },
  { id: "diversify_first", title: "Own two companies", description: "Hold shares in 2 different companies at once.", rewardXp: 45,
    measure: (c) => ({ current: c.holdingsCount, target: 2 }) },
  { id: "set_first_alert", title: "Set a price alert", description: "Create your first stock price alert.", rewardXp: 30,
    measure: (c) => ({ current: c.alertCount, target: 1 }) },
  { id: "complete_goal", title: "Complete a daily goal", description: "Finish any one of your daily objectives.", rewardXp: 35,
    measure: (c) => ({ current: c.goalCompletionCount, target: 1 }) },
  { id: "survive_week", title: "Survive a week", description: "Reach Day 7 with your account intact.", rewardXp: 50,
    measure: (c) => ({ current: Math.min(c.gameDay, 7), target: 7 }) },
];

export function useMissions() {
  const { user } = useAuth();
  const { account, watchlistSymbols, gameDay } = useGame();

  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const [tradeCount, setTradeCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [goalCompletionCount, setGoalCompletionCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) { setUnlocked({}); setLoaded(true); return; }

    const [unlockRes, tradeRes, alertRes, goalRes] = await Promise.all([
      supabase.from("user_mission_completions").select("mission_id").eq("user_id", user.id),
      supabase.from("trades").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("user_stock_alerts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("user_daily_goal_completions").select("goal_id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    const map: Record<string, boolean> = {};
    (unlockRes.data ?? []).forEach((row: { mission_id: string }) => { map[row.mission_id] = true; });
    setUnlocked(map);
    setTradeCount(tradeRes.count ?? 0);
    setAlertCount(alertRes.count ?? 0);
    setGoalCompletionCount(goalRes.count ?? 0);
    setLoaded(true);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Trade/alert counts live in Supabase, not GameContext, so nothing
  // triggers a re-fetch after a trade or alert unless we watch for it.
  // account.cash changes on every buy/sell/bill; watchlistSymbols and
  // gameDay catch the other mission conditions.
  const holdingsSignature = account.holdings.map((h) => `${h.symbol}:${h.shares}`).join("|");
  useEffect(() => {
    if (loaded) void refresh();
  }, [account.cash, holdingsSignature, gameDay, watchlistSymbols.length, loaded, refresh]);

  const missions = useMemo<Mission[]>(() => {
    const ctx: MeasureCtx = {
      tradeCount,
      holdingsCount: account.holdings.length,
      watchlistCount: watchlistSymbols.length,
      alertCount,
      goalCompletionCount,
      gameDay,
    };

    return DEFS.map((def) => {
      const { current, target } = def.measure(ctx);
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      return {
        id: def.id,
        title: def.title,
        description: def.description,
        current,
        target,
        progress,
        done: Boolean(unlocked[def.id]) || progress >= 100,
        rewardXp: def.rewardXp,
      };
    });
  }, [tradeCount, account.holdings.length, watchlistSymbols.length, alertCount, goalCompletionCount, gameDay, unlocked]);

  // Detect newly-completed missions and persist them once loaded.
  useEffect(() => {
    if (!user || !loaded) return;
    const newlyDone = missions.filter((m) => m.progress >= 100 && !unlocked[m.id] && !pending.has(m.id));
    if (newlyDone.length === 0) return;

    setPending((prev) => new Set([...prev, ...newlyDone.map((m) => m.id)]));

    (async () => {
      const { error } = await supabase.from("user_mission_completions").upsert(
        newlyDone.map((m) => ({ user_id: user.id, mission_id: m.id })),
        { onConflict: "user_id,mission_id", ignoreDuplicates: true },
      );
      if (!error) {
        setUnlocked((prev) => {
          const next = { ...prev };
          newlyDone.forEach((m) => { next[m.id] = true; });
          return next;
        });
        newlyDone.forEach((m) => {
          pushNotification({
            kind: "mission",
            title: `Mission complete: ${m.title}`,
            description: `+${m.rewardXp} XP — ${m.description}`,
          });
          addInboxMessage(user.id, {
            from: "Onboarding Coach",
            subject: `Mission complete: ${m.title}`,
            body: `${m.description} You earned +${m.rewardXp} XP.`,
            category: "mission",
          });
        });
      }
      setPending((prev) => {
        const next = new Set(prev);
        newlyDone.forEach((m) => next.delete(m.id));
        return next;
      });
    })();
  }, [missions, unlocked, pending, user, loaded]);

  const completedCount = missions.filter((m) => m.done).length;

  return { missions, completedCount, totalCount: missions.length, loaded };
}
