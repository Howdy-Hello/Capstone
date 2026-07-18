import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { getPortfolioValue } from "../data/tradingState";

export type ComputedAchievement = {
  id: string;
  title: string;
  description: string;
  reward: string;
  rewardXp: number;
  category: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number; // 0–100
};

const DEFS = [
  { id: "first_trade",      title: "First Trade",      description: "Execute your first buy or sell.",                            reward: "+100 XP", rewardXp: 100, category: "Trading"   },
  { id: "risk_taker",       title: "Risk Taker",        description: "Hold shares in 3 different companies simultaneously.",       reward: "+300 XP", rewardXp: 300, category: "Trading"   },
  { id: "smart_investor",   title: "Smart Investor",    description: "Reach a net worth of $15,000.",                              reward: "+250 XP", rewardXp: 250, category: "Portfolio" },
  { id: "cash_discipline",  title: "Cash Discipline",   description: "Keep at least 20% of net worth as cash for 5 consecutive game days.", reward: "+350 XP", rewardXp: 350, category: "Risk"     },
  { id: "hot_streak",       title: "Hot Streak",        description: "Grow your net worth for 3 consecutive game days.",            reward: "+500 XP", rewardXp: 500, category: "Mastery"   },
  { id: "market_master",    title: "Market Master",     description: "Reach a net worth of $50,000.",                              reward: "+750 XP", rewardXp: 750, category: "Mastery"   },
] as const;

type AchievementId = typeof DEFS[number]["id"];

type StreakState = {
  cashDisciplineStreak: number;
  hotStreakDays: number;
  prevNetWorth: number;
  lastCheckedDay: number;
};

const DEFAULT_STREAK: StreakState = {
  cashDisciplineStreak: 0,
  hotStreakDays: 0,
  prevNetWorth: 2000,
  lastCheckedDay: 0,
};

function streakKey(userId: string) {
  return `stockpilot-streak-${userId}`;
}

function loadStreak(userId: string): StreakState {
  try {
    const raw = localStorage.getItem(streakKey(userId));
    if (raw) return JSON.parse(raw) as StreakState;
  } catch { /* ignore */ }
  return DEFAULT_STREAK;
}

function persistStreak(userId: string, state: StreakState) {
  localStorage.setItem(streakKey(userId), JSON.stringify(state));
}

export function useAchievements() {
  const { user } = useAuth();
  const { account, stocks, gameDay } = useGame();

  const [unlocks, setUnlocks]       = useState<Record<string, string>>({});
  const [tradeCount, setTradeCount] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [streak, setStreak]         = useState<StreakState>(() =>
    user ? loadStreak(user.id) : DEFAULT_STREAK
  );

  // Load persisted unlocks + trade count once on mount
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      const [unlocksRes, tradesRes] = await Promise.all([
        supabase
          .from("user_achievement_unlocks")
          .select("achievement_id, unlocked_at")
          .eq("user_id", user.id),
        supabase
          .from("trades")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      if (cancelled) return;

      if (unlocksRes.data) {
        const map: Record<string, string> = {};
        for (const row of unlocksRes.data) map[row.achievement_id] = row.unlocked_at;
        setUnlocks(map);
      }
      if (tradesRes.count !== null) setTradeCount(tradesRes.count);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  const netWorth = useMemo(() => {
    const pv = getPortfolioValue(account, stocks);
    return account.cash + pv;
  }, [account, stocks]);

  // Update streak counters each time gameDay advances
  const prevDayRef = useRef(0);
  useEffect(() => {
    if (!user || loading) return;

    // First run after load: adopt the current day as the baseline instead of
    // treating the jump from 0 as a real advance (which double-counted streaks).
    if (prevDayRef.current === 0) {
      prevDayRef.current = gameDay;
      return;
    }

    if (gameDay <= prevDayRef.current) return;
    prevDayRef.current = gameDay;
    if (gameDay <= streak.lastCheckedDay) return;

    const cashPct = netWorth > 0 ? (account.cash / netWorth) * 100 : 0;
    const next: StreakState = {
      lastCheckedDay:       gameDay,
      cashDisciplineStreak: cashPct >= 20 ? streak.cashDisciplineStreak + 1 : 0,
      hotStreakDays:        netWorth > streak.prevNetWorth ? streak.hotStreakDays + 1 : 0,
      prevNetWorth:         netWorth,
    };
    setStreak(next);
    persistStreak(user.id, next);
  }, [gameDay, loading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute live progress for every achievement
  const achievements = useMemo<ComputedAchievement[]>(() => {
    return DEFS.map((def) => {
      let progress = 0;
      switch (def.id as AchievementId) {
        case "first_trade":
          progress = tradeCount > 0 ? 100 : 0;
          break;
        case "risk_taker":
          progress = Math.min(100, Math.round((account.holdings.length / 3) * 100));
          break;
        case "smart_investor":
          progress = Math.min(100, Math.round((netWorth / 15000) * 100));
          break;
        case "cash_discipline":
          progress = Math.min(100, Math.round((streak.cashDisciplineStreak / 5) * 100));
          break;
        case "hot_streak":
          progress = Math.min(100, Math.round((streak.hotStreakDays / 3) * 100));
          break;
        case "market_master":
          progress = Math.min(100, Math.round((netWorth / 50000) * 100));
          break;
      }

      const alreadyUnlocked = Boolean(unlocks[def.id]);
      const justHit100      = progress >= 100;

      return {
        ...def,
        progress,
        unlocked:   alreadyUnlocked || justHit100,
        unlockedAt: unlocks[def.id] ?? null,
      };
    });
  }, [account.holdings.length, netWorth, streak, tradeCount, unlocks]);

  // Persist newly-reached achievements to Supabase
  const prevProgressRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!user || loading) return;

    const newlyUnlocked = achievements.filter(
      (a) => a.progress >= 100
        && !unlocks[a.id]
        && (prevProgressRef.current[a.id] ?? 0) < 100
    );

    if (newlyUnlocked.length > 0) {
      const rows = newlyUnlocked.map((a) => ({
        user_id: user.id,
        achievement_id: a.id,
      }));

      supabase
        .from("user_achievement_unlocks")
        .upsert(rows, { onConflict: "user_id,achievement_id", ignoreDuplicates: true })
        .then(({ error }) => {
          if (error) return;
          const now = new Date().toISOString();
          setUnlocks((prev) => {
            const next = { ...prev };
            for (const a of newlyUnlocked) next[a.id] = now;
            return next;
          });
        });
    }

    prevProgressRef.current = Object.fromEntries(
      achievements.map((a) => [a.id, a.progress])
    );
  }, [achievements, loading, unlocks, user]);

  const totalXP = useMemo(
    () => achievements
      .filter((a) => a.unlocked)
      .reduce((sum, a) => sum + a.rewardXp, 0),
    [achievements]
  );

  const resetStreakForNewGame = useCallback(() => {
    if (!user) return;
    const fresh = DEFAULT_STREAK;
    setStreak(fresh);
    persistStreak(user.id, fresh);
  }, [user]);

  return { achievements, totalXP, loading, resetStreakForNewGame };
}
