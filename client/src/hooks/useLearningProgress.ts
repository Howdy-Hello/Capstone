import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";
import { LEARNING_CHANGED, LearningEntry } from "../lib/learning";
import { isMissingDbObject, supabase } from "../lib/supabase";

export function useLearningProgress() {
  const { user } = useAuth();
  const { sessionId, gameDay } = useGame();
  const [state, setState] = useState<{ scope: string; entries: LearningEntry[]; error: string | null }>({ scope: "", entries: [], error: null });
  const [revision, setRevision] = useState(0);
  const scope = `${user?.id}:${sessionId}`;
  const refresh = useCallback(() => setRevision(n => n + 1), []);
  useEffect(() => {
    window.addEventListener(LEARNING_CHANGED, refresh);
    return () => window.removeEventListener(LEARNING_CHANGED, refresh);
  }, [refresh]);
  useEffect(() => {
    if (!user || !sessionId) return;
    let cancelled = false;
    void supabase.from("learning_entries").select("*").eq("user_id", user.id).eq("session_id", sessionId)
      .order("created_at", { ascending: false }).limit(1000).then(({ data, error }) => {
        if (!cancelled) setState({ scope, entries: (data ?? []) as LearningEntry[], error: error && !isMissingDbObject(error) ? "Learning notes could not be loaded. Try again." : null });
      });
    return () => { cancelled = true; };
  }, [user, sessionId, scope, revision, gameDay]);
  const entries = state.scope === scope ? state.entries : [];
  return { entries, today: entries.filter(e => e.game_day === gameDay), error: state.scope === scope ? state.error : null, refresh };
}
