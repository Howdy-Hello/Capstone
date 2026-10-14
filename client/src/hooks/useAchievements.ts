import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { getNetWorth } from "../data/tradingState";
import { addInboxMessage } from "../lib/inbox";
import { sharedRead } from "../lib/sharedRead";

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

export type StreakState = {
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

/**
 * The streak advance rule for one game day. Returns null when the day should be
 * ignored (already counted), otherwise the state to store.
 *
 * The streak is stored per user, not per run, so a new game restarts at day 1
 * while lastCheckedDay still holds the previous run's final day. Guarding only
 * on `gameDay <= lastCheckedDay` swallowed every advance for the whole of that
 * run -- after one 30-day game, cash_discipline and hot_streak were unreachable
 * forever. A day earlier than the stored one means the streak belongs to a
 * finished (or rewound) run, so a fresh streak starts from this day.
 */
export function nextStreakState(
  streak: StreakState,
  gameDay: number,
  cash: number,
  netWorth: number
): StreakState | null {
  const staleRun = gameDay < streak.lastCheckedDay;
  if (!staleRun && gameDay <= streak.lastCheckedDay) return null;

  const base = staleRun ? { ...DEFAULT_STREAK, prevNetWorth: netWorth } : streak;
  const cashPct = netWorth > 0 ? (cash / netWorth) * 100 : 0;

  return {
    lastCheckedDay:       gameDay,
    cashDisciplineStreak: cashPct >= 20 ? base.cashDisciplineStreak + 1 : 0,
    hotStreakDays:        netWorth > base.prevNetWorth ? base.hotStreakDays + 1 : 0,
    prevNetWorth:         netWorth,
  };
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

// One pop-up queue for the whole app. Each useAchievements() call used to own
// its own queue, and only Game.tsx displays one, so an unlock detected by the
// Header's instance (mounted on every page) was queued where nobody looked --
// a first trade on a stock's page never showed its pop-up.
let sharedQueue: ComputedAchievement[] = [];
const queueListeners = new Set<() => void>();

function setSharedQueue(update: (current: ComputedAchievement[]) => ComputedAchievement[]) {
  sharedQueue = update(sharedQueue);
  queueListeners.forEach((listener) => listener());
}

function subscribeToQueue(listener: () => void) {
  queueListeners.add(listener);
  return () => {
    queueListeners.delete(listener);
  };
}

function getQueueSnapshot() {
  return sharedQueue;
}

export function useAchievements() {
  const { user } = useAuth();
  const { account, stocks, gameDay, watchlistStocks, sessionId, cashStreak, gainStreak, verifiedRun } = useGame();

  const [unlocks, setUnlocks]       = useState<Record<string, string>>({});
  const [tradeCount, setTradeCount] = useState(0);
  const [unlockRates, setUnlockRates] = useState<Record<string, number>>({});
  const [loading, setLoading]       = useState(true);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const notificationQueue = useSyncExternalStore(subscribeToQueue, getQueueSnapshot);
  const [suppressedUnlocks, setSuppressedUnlocks] = useState<Set<string>>(() =>
    user ? loadSuppressedAchievements(user.id) : new Set()
  );
  const [streak, setStreak]         = useState<StreakState>(() =>
    user ? loadStreak(user.id) : DEFAULT_STREAK
  );
  const pendingUnlocksRef = useRef(new Set<string>());
  // Ids the server refused (its state doesn't meet the condition yet). Skipped
  // until the game state changes, so the unlock effect doesn't retry every render.
  const [rejectedUnlocks, setRejectedUnlocks] = useState<Set<string>>(() => new Set());

  // Each instance used to send its own copy of these reads: one Game page load
  // fired 9 unlock reads, 6 rate reads and 16 trade counts. shareKey lets other
  // instances in the same state join a read; a read after this instance's own
  // write passes none, so it sees that write.
  const refreshUnlocks = useCallback(async (shareKey?: string) => {
    if (!user) {
      setUnlocks({});
      return false;
    }

    const read = () => supabase
      .from("user_achievement_unlocks")
      .select("achievement_id, unlocked_at")
      .eq("user_id", user.id);
    const { data, error } = shareKey ? await sharedRead(`unlocks:${user.id}:${shareKey}`, read) : await read();

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

  const refreshTradeCount = useCallback(async (shareKey?: string) => {
    // Before the run has loaded there is nothing to count.
    if (!user || !sessionId) {
      setTradeCount(0);
      return;
    }

    const read = () => supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);
    const { count, error } = shareKey ? await sharedRead(`trades:${sessionId}:${shareKey}`, read) : await read();

    if (!error && count !== null) setTradeCount(count);
  }, [user, sessionId]);

  const refreshUnlockRates = useCallback(async (shareKey?: string) => {
    if (!user) {
      setUnlockRates({});
      return {};
    }

    const read = () => supabase.rpc("get_achievement_unlock_rates");
    const { data, error } = shareKey ? await sharedRead(`rates:${user.id}:${shareKey}`, read) : await read();
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
      await Promise.all([refreshUnlocks("hydrate"), refreshTradeCount("hydrate"), refreshUnlockRates("hydrate")]);
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
    if (!loading) void refreshTradeCount(`${account.cash}|${holdingsSignature}`);
  }, [account.cash, holdingsSignature, loading, refreshTradeCount]);

  useEffect(() => {
    setRejectedUnlocks((current) => (current.size === 0 ? current : new Set()));
  }, [account.cash, holdingsSignature, gameDay, sessionId, tradeCount, watchlistStocks.length]);

  useEffect(() => {
    setStreak(user ? loadStreak(user.id) : DEFAULT_STREAK);
  }, [user]);

  const netWorth = useMemo(() => getNetWorth(account, stocks), [account, stocks]);
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

    // A backwards jump means a new game started under a mounted hook. Re-baseline
    // rather than early-returning: leaving the ref at the old game's final day
    // would swallow every advance of the new run (a 30-day game never gets past
    // day 30, so the streak achievements would be dead for its entire length).
    if (gameDay < prevDayRef.current) {
      prevDayRef.current = gameDay;
      return;
    }
    if (gameDay === prevDayRef.current) return;
    prevDayRef.current = gameDay;
    // The day advance awards the streak achievements on the server.
    void refreshUnlocks(`day-${gameDay}`);

    const next = nextStreakState(streak, gameDay, account.cash, netWorth);
    if (!next) return;
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
          progress = Math.min(100, Math.floor((account.holdings.length / 3) * 100));
          break;
        case "active_trader":
          progress = Math.min(100, Math.floor((tradeCount / 10) * 100));
          break;
        case "diversified":
          progress = Math.min(100, Math.floor((account.holdings.length / 5) * 100));
          break;
        case "sector_scout":
          progress = Math.min(100, Math.floor((heldSectorCount / 3) * 100));
          break;
        case "watchlist_builder":
          progress = Math.min(100, Math.floor((watchlistStocks.length / 3) * 100));
          break;
        case "cash_builder":
          progress = Math.min(100, Math.floor((account.cash / 5000) * 100));
          break;
        case "market_regular":
          progress = Math.min(100, Math.floor((gameDay / 5) * 100));
          break;
        case "closing_bell":
          progress = Math.min(100, Math.floor((gameDay / 30) * 100));
          break;
        case "smart_investor":
          progress = Math.min(100, Math.floor((netWorth / 15000) * 100));
          break;
        case "cash_discipline":
          progress = Math.min(100, Math.floor((cashStreak / 5) * 100));
          break;
        case "hot_streak":
          progress = Math.min(100, Math.floor((gainStreak / 3) * 100));
          break;
        case "market_master":
          progress = Math.min(100, Math.floor((netWorth / 50000) * 100));
          break;
      }

      const alreadyUnlocked = Boolean(unlocks[def.id]);

      return {
        ...def,
        progress,
        unlocked:   alreadyUnlocked,
        unlockedAt: unlocks[def.id] ?? null,
        achievedByPercent: unlockRates[def.id] ?? 0,
      };
    });
  }, [
    account.cash, account.holdings.length, gameDay, heldSectorCount, netWorth,
    cashStreak, gainStreak, tradeCount, unlockRates, unlocks, watchlistStocks.length,
  ]);

  // The server checks each condition itself (claim_achievements) and returns
  // the ids it accepted; players can no longer insert unlock rows directly.
  const claimUnlocks = useCallback(async (ids: string[]) => {
    if (!sessionId) return { granted: [] as string[], error: "No active game." };
    const { data, error } = await supabase.rpc("claim_achievements", {
      target_session_id: sessionId,
      p_achievement_ids: ids,
    });
    if (error) return { granted: [] as string[], error: error.message };
    return { granted: (data ?? []) as string[], error: null };
  }, [sessionId]);

  // Persist newly-reached achievements and then hydrate their server timestamps.
  const persistUnlocks = useCallback(async (candidates: ComputedAchievement[]) => {
    if (!user || !sessionId || candidates.length === 0) return;

    for (const item of candidates) pendingUnlocksRef.current.add(item.id);
    const { granted, error } = await claimUnlocks(candidates.map((item) => item.id));
    for (const item of candidates) pendingUnlocksRef.current.delete(item.id);

    if (error) {
      setPersistenceError(`Could not save achievements: ${error}`);
      return;
    }

    const grantedSet = new Set(granted);
    const refusedIds = candidates.filter((item) => !grantedSet.has(item.id)).map((item) => item.id);
    if (refusedIds.length > 0) {
      setRejectedUnlocks((current) => new Set([...Array.from(current), ...refusedIds]));
    }
    const items = candidates.filter((item) => grantedSet.has(item.id));
    if (items.length === 0) return;

    const [, latestRates] = await Promise.all([refreshUnlocks(), refreshUnlockRates()]);
    items.forEach((item) => {
      addInboxMessage(user.id, {
        id: `achievement-${item.id}`,
        from: "Achievements Desk",
        subject: `Achievement unlocked: ${item.title}`,
        body: `${item.description} Reward: ${item.reward}.`,
        category: "achievement",
      });
    });
    setSharedQueue((current) => {
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
  }, [claimUnlocks, refreshUnlockRates, refreshUnlocks, sessionId, user]);

  useEffect(() => {
    if (!user || loading || !verifiedRun || persistenceError) return;

    const newlyUnlocked = achievements.filter(
      (a) => a.progress >= 100
        && !unlocks[a.id]
        && !suppressedUnlocks.has(a.id)
        && !rejectedUnlocks.has(a.id)
        && !pendingUnlocksRef.current.has(a.id)
    );

    if (newlyUnlocked.length > 0) void persistUnlocks(newlyUnlocked);
  }, [achievements, rejectedUnlocks, loading, persistUnlocks, suppressedUnlocks, unlocks, user, verifiedRun, persistenceError]);

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

  // XP backed by rows that actually exist in user_achievement_unlocks.
  //
  // totalXP above is optimistic: an achievement counts as soon as local progress
  // hits 100%, in the same render that merely *starts* the upsert. Anything that
  // asks the server to act on XP must wait for the row to land, or the server
  // reads the pre-insert total. That is what made the level cash reward silently
  // skip: process_level_cash_rewards ran against stale XP, returned $0, and the
  // caller's "already processed this XP" guard then blocked any retry.
  const confirmedXP = useMemo(
    () => achievements
      .filter((achievement) => Boolean(unlocks[achievement.id]))
      .reduce((sum, achievement) => sum + achievement.rewardXp, 0),
    [achievements, unlocks]
  );

  const resetStreakForNewGame = useCallback(() => {
    if (!user) return;
    const fresh = DEFAULT_STREAK;
    // Re-baseline the day tracker too, so the new game's first advance counts.
    prevDayRef.current = 0;
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
    setSharedQueue((current) => current.slice(1));
  }, []);

  const devUnlockAchievements = useCallback(async (
    requestedId: string | "all"
  ): Promise<AchievementCommandResult> => {
    if (!user) return { ok: false, message: "Authentication required." };

    let definitions: Array<typeof DEFS[number]> = requestedId === "all"
      ? [...DEFS]
      : DEFS.filter((definition) => definition.id === requestedId);
    if (definitions.length === 0) {
      return {
        ok: false,
        message: `Unknown achievement: ${requestedId}. Valid IDs: ${DEFS.map((definition) => definition.id).join(", ")}.`,
      };
    }

    // Same server check as a normal unlock: the console can only unlock what
    // the current run has actually earned.
    const { granted, error } = await claimUnlocks(definitions.map((definition) => definition.id));
    if (error) return { ok: false, message: `Achievement command failed: ${error}` };

    const grantedSet = new Set(granted);
    const refusedIds = definitions
      .filter((definition) => !grantedSet.has(definition.id))
      .map((definition) => definition.id);
    definitions = definitions.filter((definition) => grantedSet.has(definition.id));
    if (definitions.length === 0) {
      return { ok: false, message: `Not earned yet: ${refusedIds.join(", ")}.` };
    }

    const { data } = await supabase
      .from("user_achievement_unlocks")
      .select("achievement_id, unlocked_at")
      .eq("user_id", user.id);
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
    setSharedQueue((current) => {
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

    const refusedNote = refusedIds.length > 0 ? ` Not earned yet: ${refusedIds.join(", ")}.` : "";
    return {
      ok: true,
      message: (requestedId === "all"
        ? `Unlocked ${definitions.length} earned achievements.`
        : `Unlocked ${definitions[0].id}.`) + refusedNote,
    };
  }, [claimUnlocks, refreshUnlockRates, unlockRates, user]);

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
    setSharedQueue((current) =>
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
    confirmedXP,
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
