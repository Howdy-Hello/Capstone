import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { getPortfolioValue } from "../data/tradingState";
import { addInboxMessage } from "../lib/inbox";

export type ComputedAchievement = {
  id: string;
  title: string;
  description: string;
  reward: string;
  rewardXp: number;
  category: string;
  unlocked: boolean;
  unlockedAt: string | null;
  achievedByPercent: number;
  progress: number; // 0–100
};

export type AchievementCommandResult = {
  ok: boolean;
  message: string;
};

type AchievementUnlockRow = {
  achievement_id: string;
  unlocked_at: string;
};

type AchievementUnlockRateRow = {
  achievement_id: string;
  unlock_percentage: number | string;
};

const DEFS = [
  { id: "first_trade",      title: "First Trade",      description: "Execute your first buy or sell.",                            reward: "+100 XP", rewardXp: 100, category: "Trading"   },
  { id: "risk_taker",       title: "Risk Taker",        description: "Hold shares in 3 different companies simultaneously.",       reward: "+300 XP", rewardXp: 300, category: "Trading"   },
  { id: "active_trader",    title: "Active Trader",     description: "Execute 10 trades.",                                         reward: "+450 XP", rewardXp: 450, category: "Trading"   },
  { id: "diversified",      title: "Diversified",       description: "Hold shares in 5 different companies simultaneously.",       reward: "+500 XP", rewardXp: 500, category: "Portfolio" },
  { id: "sector_scout",     title: "Sector Scout",      description: "Hold companies from 3 different market sectors.",            reward: "+400 XP", rewardXp: 400, category: "Portfolio" },
  { id: "watchlist_builder", title: "Watchlist Builder", description: "Track 3 companies on your watchlist.",                       reward: "+150 XP", rewardXp: 150, category: "Research"  },
  { id: "cash_builder",     title: "Cash Builder",      description: "Grow your available cash balance to $5,000.",                reward: "+250 XP", rewardXp: 250, category: "Portfolio" },
  { id: "market_regular",   title: "Market Regular",    description: "Reach Day 5 in a game.",                                     reward: "+125 XP", rewardXp: 125, category: "Progress"  },
  { id: "closing_bell",     title: "Closing Bell",      description: "Reach Day 30 in a game.",                                    reward: "+600 XP", rewardXp: 600, category: "Progress"  },
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

function suppressedAchievementsKey(userId: string) {
  return `stockpilot-dev-cleared-achievements-${userId}`;
}

function loadSuppressedAchievements(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(suppressedAchievementsKey(userId));
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore malformed dev state */ }
  return new Set();
}

export function useAchievements() {
  const { user } = useAuth();
  const { account, stocks, gameDay, watchlistStocks } = useGame();

  const [unlocks, setUnlocks]       = useState<Record<string, string>>({});
  const [tradeCount, setTradeCount] = useState(0);
  const [unlockRates, setUnlockRates] = useState<Record<string, number>>({});
  const [loading, setLoading]       = useState(true);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [notificationQueue, setNotificationQueue] = useState<ComputedAchievement[]>([]);
  const [suppressedUnlocks, setSuppressedUnlocks] = useState<Set<string>>(() =>
    user ? loadSuppressedAchievements(user.id) : new Set()
  );
  const [streak, setStreak]         = useState<StreakState>(() =>
    user ? loadStreak(user.id) : DEFAULT_STREAK
  );
  const pendingUnlocksRef = useRef(new Set<string>());

  const refreshUnlocks = useCallback(async () => {
    if (!user) {
      setUnlocks({});
      return false;
    }

    const { data, error } = await supabase
      .from("user_achievement_unlocks")
      .select("achievement_id, unlocked_at")
      .eq("user_id", user.id);

    if (error) {
      setPersistenceError(`Could not load achievements: ${error.message}`);
      return false;
    }

    const map: Record<string, string> = {};
    for (const row of (data ?? []) as AchievementUnlockRow[]) {
      map[row.achievement_id] = row.unlocked_at;
    }
    setUnlocks(map);
    setPersistenceError(null);
    return true;
  }, [user]);

  const refreshTradeCount = useCallback(async () => {
    if (!user) {
      setTradeCount(0);
      return;
    }

    const { count, error } = await supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (!error && count !== null) setTradeCount(count);
  }, [user]);

  const refreshUnlockRates = useCallback(async () => {
    if (!user) {
      setUnlockRates({});
      return {};
    }

    const { data, error } = await supabase.rpc("get_achievement_unlock_rates");
    if (error) {
      setPersistenceError(`Could not load achievement statistics: ${error.message}`);
      return {};
    }

    const rates: Record<string, number> = {};
    for (const row of (data ?? []) as AchievementUnlockRateRow[]) {
      rates[row.achievement_id] = Number(row.unlock_percentage);
    }
    setUnlockRates(rates);
    return rates;
  }, [user]);

  // Hydrate cloud unlocks whenever the authenticated user changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setUnlocks({});
    setSuppressedUnlocks(user ? loadSuppressedAchievements(user.id) : new Set());
    pendingUnlocksRef.current.clear();

    (async () => {
      await Promise.all([refreshUnlocks(), refreshTradeCount(), refreshUnlockRates()]);
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [refreshTradeCount, refreshUnlockRates, refreshUnlocks, user]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(
      suppressedAchievementsKey(user.id),
      JSON.stringify(Array.from(suppressedUnlocks))
    );
  }, [suppressedUnlocks, user]);

  // A completed trade changes the account. Recount so First Trade unlocks
  // immediately instead of only after a page reload.
  const holdingsSignature = account.holdings
    .map((holding) => `${holding.symbol}:${holding.shares}`)
    .sort()
    .join("|");
  useEffect(() => {
    if (!loading) void refreshTradeCount();
  }, [account.cash, holdingsSignature, loading, refreshTradeCount]);

  useEffect(() => {
    setStreak(user ? loadStreak(user.id) : DEFAULT_STREAK);
  }, [user]);

  const netWorth = useMemo(() => {
    const pv = getPortfolioValue(account, stocks);
    return account.cash + pv;
  }, [account, stocks]);
  const heldSectorCount = useMemo(() => {
    const heldSymbols = new Set(account.holdings.map((holding) => holding.symbol));
    return new Set(
      stocks
        .filter((stock) => heldSymbols.has(stock.symbol))
        .map((stock) => stock.sector)
    ).size;
  }, [account.holdings, stocks]);

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
        case "active_trader":
          progress = Math.min(100, Math.round((tradeCount / 10) * 100));
          break;
        case "diversified":
          progress = Math.min(100, Math.round((account.holdings.length / 5) * 100));
          break;
        case "sector_scout":
          progress = Math.min(100, Math.round((heldSectorCount / 3) * 100));
          break;
        case "watchlist_builder":
          progress = Math.min(100, Math.round((watchlistStocks.length / 3) * 100));
          break;
        case "cash_builder":
          progress = Math.min(100, Math.round((account.cash / 5000) * 100));
          break;
        case "market_regular":
          progress = Math.min(100, Math.round((gameDay / 5) * 100));
          break;
        case "closing_bell":
          progress = Math.min(100, Math.round((gameDay / 30) * 100));
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
      const justHit100      = progress >= 100 && !suppressedUnlocks.has(def.id);

      return {
        ...def,
        progress,
        unlocked:   alreadyUnlocked || justHit100,
        unlockedAt: unlocks[def.id] ?? null,
        achievedByPercent: unlockRates[def.id] ?? 0,
      };
    });
  }, [
    account.cash, account.holdings.length, gameDay, heldSectorCount, netWorth,
    streak, suppressedUnlocks, tradeCount, unlockRates, unlocks, watchlistStocks.length,
  ]);

  // Persist newly-reached achievements and then hydrate their server timestamps.
  const persistUnlocks = useCallback(async (items: ComputedAchievement[]) => {
    if (!user || items.length === 0) return;

    for (const item of items) pendingUnlocksRef.current.add(item.id);
    const rows = items.map((item) => ({
      user_id: user.id,
      achievement_id: item.id,
    }));

    const { error } = await supabase
      .from("user_achievement_unlocks")
      .upsert(rows, {
        onConflict: "user_id,achievement_id",
        ignoreDuplicates: true,
      });

    for (const item of items) pendingUnlocksRef.current.delete(item.id);

    if (error) {
      setPersistenceError(`Could not save achievements: ${error.message}`);
      return;
    }

    const [, latestRates] = await Promise.all([refreshUnlocks(), refreshUnlockRates()]);
    items.forEach((item) => {
      addInboxMessage(user.id, {
        from: "Achievements Desk",
        subject: `Achievement unlocked: ${item.title}`,
        body: `${item.description} Reward: ${item.reward}.`,
        category: "achievement",
      });
    });
    setNotificationQueue((current) => {
      const queuedIds = new Set(current.map((achievement) => achievement.id));
      return [
        ...current,
        ...items
          .filter((achievement) => !queuedIds.has(achievement.id))
          .map((achievement) => ({
            ...achievement,
            achievedByPercent: latestRates[achievement.id] ?? achievement.achievedByPercent,
          })),
      ];
    });
  }, [refreshUnlockRates, refreshUnlocks, user]);

  useEffect(() => {
    if (!user || loading) return;

    const newlyUnlocked = achievements.filter(
      (a) => a.progress >= 100
        && !unlocks[a.id]
        && !suppressedUnlocks.has(a.id)
        && !pendingUnlocksRef.current.has(a.id)
    );

    if (newlyUnlocked.length > 0) void persistUnlocks(newlyUnlocked);
  }, [achievements, loading, persistUnlocks, suppressedUnlocks, unlocks, user]);

  // Once the real condition falls below its target, a dev-cleared achievement
  // becomes eligible to unlock naturally again.
  useEffect(() => {
    const resettable = achievements
      .filter((achievement) => achievement.progress < 100)
      .map((achievement) => achievement.id);
    if (resettable.length === 0) return;

    setSuppressedUnlocks((current) => {
      if (!resettable.some((id) => current.has(id))) return current;
      const next = new Set(current);
      resettable.forEach((id) => next.delete(id));
      return next;
    });
  }, [achievements]);

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

  const retryPersistence = useCallback(async () => {
    setPersistenceError(null);
    const unsaved = achievements.filter((achievement) =>
      achievement.progress >= 100 && !unlocks[achievement.id]
    );
    if (unsaved.length > 0) {
      await persistUnlocks(unsaved);
    } else {
      await refreshUnlocks();
    }
  }, [achievements, persistUnlocks, refreshUnlocks, unlocks]);

  const dismissAchievementNotification = useCallback(() => {
    setNotificationQueue((current) => current.slice(1));
  }, []);

  const devUnlockAchievements = useCallback(async (
    requestedId: string | "all"
  ): Promise<AchievementCommandResult> => {
    if (!user) return { ok: false, message: "Authentication required." };

    const definitions = requestedId === "all"
      ? [...DEFS]
      : DEFS.filter((definition) => definition.id === requestedId);
    if (definitions.length === 0) {
      return {
        ok: false,
        message: `Unknown achievement: ${requestedId}. Valid IDs: ${DEFS.map((definition) => definition.id).join(", ")}.`,
      };
    }

    const { data, error } = await supabase
      .from("user_achievement_unlocks")
      .upsert(
        definitions.map((definition) => ({
          user_id: user.id,
          achievement_id: definition.id,
        })),
        { onConflict: "user_id,achievement_id" }
      )
      .select("achievement_id, unlocked_at");

    if (error) return { ok: false, message: `Achievement command failed: ${error.message}` };

    const savedRows = (data ?? []) as AchievementUnlockRow[];
    const savedAt = new Map(savedRows.map((row) => [row.achievement_id, row.unlocked_at]));
    setUnlocks((current) => {
      const next = { ...current };
      definitions.forEach((definition) => {
        next[definition.id] = savedAt.get(definition.id) ?? new Date().toISOString();
      });
      return next;
    });
    setSuppressedUnlocks((current) => {
      const next = new Set(current);
      definitions.forEach((definition) => next.delete(definition.id));
      return next;
    });
    const latestRates = await refreshUnlockRates();
    setNotificationQueue((current) => {
      const replacingIds = new Set<string>(definitions.map((definition) => definition.id));
      const remaining = current.filter((achievement) => !replacingIds.has(achievement.id));
      const notifications: ComputedAchievement[] = definitions.map((definition) => ({
        ...definition,
        progress: 100,
        unlocked: true,
        unlockedAt: savedAt.get(definition.id) ?? new Date().toISOString(),
        achievedByPercent: latestRates[definition.id] ?? unlockRates[definition.id] ?? 0,
      }));
      return [...remaining, ...notifications];
    });
    setPersistenceError(null);

    return {
      ok: true,
      message: requestedId === "all"
        ? `Unlocked all ${definitions.length} achievements.`
        : `Unlocked ${definitions[0].id}.`,
    };
  }, [refreshUnlockRates, unlockRates, user]);

  const devClearAchievements = useCallback(async (
    requestedId: string | "all"
  ): Promise<AchievementCommandResult> => {
    if (!user) return { ok: false, message: "Authentication required." };
    if (requestedId !== "all" && !DEFS.some((definition) => definition.id === requestedId)) {
      return {
        ok: false,
        message: `Unknown achievement: ${requestedId}. Valid IDs: ${DEFS.map((definition) => definition.id).join(", ")}.`,
      };
    }

    let query = supabase
      .from("user_achievement_unlocks")
      .delete()
      .eq("user_id", user.id);
    if (requestedId !== "all") query = query.eq("achievement_id", requestedId);
    const { error } = await query;

    if (error) return { ok: false, message: `Achievement command failed: ${error.message}` };

    const clearedIds = requestedId === "all"
      ? DEFS.map((definition) => definition.id)
      : [requestedId];
    const clearedSet = new Set<string>(clearedIds);
    setUnlocks((current) => {
      const next = { ...current };
      clearedIds.forEach((id) => delete next[id]);
      return next;
    });
    setSuppressedUnlocks((current) => new Set([...Array.from(current), ...clearedIds]));
    setNotificationQueue((current) =>
      current.filter((achievement) => !clearedSet.has(achievement.id))
    );
    setPersistenceError(null);
    await refreshUnlockRates();

    return {
      ok: true,
      message: requestedId === "all"
        ? "Cleared all achievements."
        : `Cleared ${requestedId}.`,
    };
  }, [refreshUnlockRates, user]);

  return {
    achievements,
    totalXP,
    loading,
    persistenceError,
    retryPersistence,
    achievementNotification: notificationQueue[0] ?? null,
    queuedNotificationCount: notificationQueue.length,
    dismissAchievementNotification,
    achievementIds: DEFS.map((definition) => definition.id),
    devUnlockAchievements,
    devClearAchievements,
    resetStreakForNewGame,
  };
}
