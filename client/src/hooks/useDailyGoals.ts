import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { useLearningProgress } from "./useLearningProgress";
import { LearningKind } from "../lib/learning";
import { useGame } from "../context/GameContext";
import { supabase } from "../lib/supabase";

export type DailyGoal = {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  kind?: LearningKind;
  progress: number; // 0–100
  done: boolean;
};

type MeasureCtx = { watchlistCount: number; learned: Set<string> };
type GoalDef = { id: string; title: string; description: string; kind?: LearningKind; measure: (ctx: MeasureCtx) => { current: number; target: number } };
const GOAL_POOL: GoalDef[] = [
  { id: "learn_research", kind: "research", title: "Understand a business", description: "Record a business fact and one uncertainty before deciding.", measure: c => ({ current: Number(c.learned.has("research")), target: 1 }) },
  { id: "learn_compare", kind: "compare", title: "Compare with context", description: "Explain one meaningful difference between two companies.", measure: c => ({ current: Number(c.learned.has("compare")), target: 1 }) },
  { id: "learn_risk", kind: "risk", title: "Investigate risk", description: "Explain a stock's risk and whether it fits your cash needs and portfolio. Avoiding it counts.", measure: c => ({ current: Number(c.learned.has("risk")), target: 1 }) },
  { id: "learn_plan", kind: "plan", title: "Keep a plan", description: "Write your goal, when you need the money, and what would change your mind.", measure: c => ({ current: Number(c.learned.has("plan")), target: 1 }) },
  { id: "learn_wait", kind: "wait", title: "Choose thoughtfully", description: "Explain a decision to wait or avoid an investment, and what you would check next.", measure: c => ({ current: Number(c.learned.has("wait")), target: 1 }) },
  { id: "watch2", title: "Build a research queue", description: "Watch two stocks without committing cash.", measure: c => ({ current: c.watchlistCount, target: 2 }) },
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

export function useDailyGoals() {
  const { user } = useAuth();
  const { watchlistSymbols, gameDay, marketSeed, sessionId } = useGame();
  const learning = useLearningProgress();
  const refreshLearning = learning.refresh;
  const scope = `${user?.id}:${sessionId}:${gameDay}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [completed, setCompleted] = useState<{ scope: string; ids: Set<string> }>({ scope: "", ids: new Set() });
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const attempted = useRef(new Set<string>());
  const reached = useRef(new Set<string>());
  const completedIds = useMemo(() => completed.scope === scope ? completed.ids : new Set<string>(), [completed, scope]);
  useEffect(() => { attempted.current.clear(); reached.current.clear(); setPersistenceError(null); }, [scope]);
  useEffect(() => {
    if (!user || !sessionId) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.from("user_daily_goal_completions").select("goal_id")
        .eq("user_id", user.id).eq("session_id", sessionId).eq("game_day", gameDay);
      if (cancelled) return;
      if (error) { setPersistenceError("Daily goals could not be loaded. Try again."); return; }
      setCompleted(current => ({ scope, ids: new Set([...(current.scope === scope ? current.ids : []), ...(data ?? []).map((g) => g.goal_id)]) }));
    })();
    return () => { cancelled = true; };
  }, [user, sessionId, gameDay, scope, retry]);

  const goals = useMemo<DailyGoal[]>(() => {
    const ctx: MeasureCtx = { watchlistCount: watchlistSymbols.length, learned: new Set(learning.today.map(entry => entry.kind)) };

    return selectGoals(user?.id ?? "guest", gameDay, marketSeed).map((def) => {
      const { current, target } = def.measure(ctx);
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      return {
        id: def.id,
        title: def.title,
        kind: def.kind,
        description: def.description,
        current,
        target,
        progress,
        done: completedIds.has(def.id),
      };
    });
  }, [watchlistSymbols, learning.today, gameDay, marketSeed, user, completedIds]);

  useEffect(() => {
    if (!user || !sessionId || completed.scope !== scope) return;
    goals.filter(g => g.current >= g.target).forEach(g => reached.current.add(g.id));
    const ids = [...reached.current].filter(id => !completedIds.has(id) && !attempted.current.has(id));
    if (!ids.length) return;
    ids.forEach(id => attempted.current.add(id));
    void (async () => {
      const { error } = await supabase.from("user_daily_goal_completions").upsert(
        ids.map(goal_id => ({ user_id: user.id, session_id: sessionId, game_day: gameDay, goal_id })),
        { onConflict: "user_id,session_id,game_day,goal_id", ignoreDuplicates: true });
      if (currentScope.current !== scope) return;
      if (error) { setPersistenceError("Daily goal progress could not be saved. Try again."); return; }
      setCompleted(current => current.scope === scope ? { scope, ids: new Set([...current.ids, ...ids]) } : current);
      setPersistenceError(null);
    })();
  }, [goals, completed.scope, completedIds, scope, user, sessionId, gameDay, retry]);

  const retryPersistence = useCallback(() => {
    attempted.current.clear();
    refreshLearning();
    setPersistenceError(null);
    setRetry(value => value + 1);
  }, [refreshLearning]);
  return { goals, completedCount: goals.filter(g => g.done).length, persistenceError: persistenceError ?? learning.error, retryPersistence };
}
