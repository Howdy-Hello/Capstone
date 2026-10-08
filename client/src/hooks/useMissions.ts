import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLearningProgress } from "./useLearningProgress";
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
};

type MeasureCtx = {
  learningCount: number;
  riskCount: number;
  watchlistCount: number;
  alertCount: number;
  goalCompletionCount: number;
  gameDay: number;
};

type MissionDef = {
  id: string;
  title: string;
  description: string;
  measure: (ctx: MeasureCtx) => { current: number; target: number };
};

const DEFS: MissionDef[] = [
  { id: "first_learning_note", title: "Explain your first decision", description: "Record evidence for a decision, including choosing to wait.",
    measure: (c) => ({ current: c.learningCount, target: 1 }) },
  { id: "build_watchlist", title: "Start a watchlist", description: "Add a stock to your watchlist.",
    measure: (c) => ({ current: c.watchlistCount, target: 1 }) },
  { id: "first_risk_review", title: "Recognize portfolio risk", description: "Record a risk review before committing money.",
    measure: (c) => ({ current: c.riskCount, target: 1 }) },
  { id: "set_first_alert", title: "Set a price alert", description: "Create your first stock price alert.",
    measure: (c) => ({ current: c.alertCount, target: 1 }) },
  { id: "complete_goal", title: "Complete a daily goal", description: "Finish any one of your daily objectives.",
    measure: (c) => ({ current: c.goalCompletionCount, target: 1 }) },
  { id: "survive_week", title: "Review a week", description: "Reach Day 7 and review your cash needs. Trading is optional.",
    measure: (c) => ({ current: Math.min(c.gameDay, 7), target: 7 }) },
];

export function useMissions() {
  const { user } = useAuth();
  const { account, watchlistSymbols, gameDay } = useGame();

  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const learning = useLearningProgress();
  const [alertCount, setAlertCount] = useState(0);
  const [goalCompletionCount, setGoalCompletionCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // In-flight and permanently-failed mission ids. A ref, not state, and
  // deliberately NOT an effect dependency: when this was state, a failed upsert
  // removed the id again, which changed the Set identity, which re-ran the
  // effect, which saw the mission still un-persisted and fired the same write
  // -- one request per render cycle, forever, with nothing surfaced to the
  // player. Ids are now dropped only on success, so a hard failure stops after
  // one attempt and reports itself.
  const pendingRef = useRef<Set<string>>(new Set());
  const reachedRef = useRef(new Map<string, Mission>());
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => { pendingRef.current.clear(); reachedRef.current.clear(); setPersistenceError(null); }, [user?.id]);

  const refresh = useCallback(async () => {
    if (!user) { setUnlocked({}); setLoaded(true); return; }

    const [unlockRes, alertRes, goalRes] = await Promise.all([
      supabase.from("user_mission_completions").select("mission_id").eq("user_id", user.id),
      supabase.from("user_stock_alerts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("user_daily_goal_completions").select("goal_id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    const map: Record<string, boolean> = {};
    (unlockRes.data ?? []).forEach((row: { mission_id: string }) => { map[row.mission_id] = true; });
    setUnlocked(map);
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
      learningCount: learning.entries.length,
      riskCount: learning.entries.filter(entry => entry.kind === "risk").length,
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
        done: Boolean(unlocked[def.id]),
      };
    });
  }, [learning.entries, watchlistSymbols.length, alertCount, goalCompletionCount, gameDay, unlocked]);

  // Detect newly-completed missions and persist them once loaded.
  useEffect(() => {
    if (!user || !loaded) return;
    missions.filter(m => m.current >= m.target).forEach(m => reachedRef.current.set(m.id, m));
    const newlyDone = [...reachedRef.current.values()].filter(
      (m) => !unlocked[m.id] && !pendingRef.current.has(m.id)
    );
    if (newlyDone.length === 0) return;

    newlyDone.forEach((m) => pendingRef.current.add(m.id));

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
            id: `mission-${m.id}`,
            kind: "mission",
            title: `Mission complete: ${m.title}`,
            description: m.description,
          });
          addInboxMessage(user.id, {
            id: `mission-${m.id}`,
            from: "Your Advisor",
            subject: `Mission complete: ${m.title}`,
            body: m.description,
            category: "mission",
          });
        });
        newlyDone.forEach((m) => pendingRef.current.delete(m.id));
        setPersistenceError(null);
      } else {
        // Leave the ids in pendingRef so this does not spin, and tell the
        // player their progress is showing locally but has not been saved.
        setPersistenceError(
          "Mission progress could not be saved. Try again."
        );
      }
    })();
  }, [missions, unlocked, user, loaded, retryToken]);

  // Clearing the ref alone changed no dependency, so the save never re-ran.
  const retryPersistence = useCallback(() => {
    pendingRef.current.clear();
    setPersistenceError(null);
    setRetryToken((token) => token + 1);
  }, []);

  const completedCount = missions.filter((m) => m.done).length;

  return {
    missions, completedCount, totalCount: missions.length, loaded,
    persistenceError, retryPersistence,
  };
}
