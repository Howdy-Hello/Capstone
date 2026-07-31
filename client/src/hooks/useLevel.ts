import { useEffect, useRef } from "react";

import { useAuth } from "../context/AuthContext";
import { useAchievements } from "./useAchievements";
import { useMissions } from "./useMissions";
import { useDailyGoals } from "./useDailyGoals";
import { addInboxMessage } from "../lib/inbox";

// A player level derived from XP already tracked by achievements, missions,
// and today's daily goals — no separate XP ledger. Achievements/missions are
// persisted forever in Supabase, so their XP only ever grows; daily goals
// only contribute the current day's total since historical days aren't
// re-queried, which keeps this cheap while still reflecting real progress.
function xpForLevel(level: number) {
  return Math.round(100 * Math.pow(Math.max(0, level - 1), 1.5));
}

function levelFromXp(totalXp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) level += 1;
  return level;
}

function levelStorageKey(userId: string) {
  return `stockpilot-last-level-${userId}`;
}

export function useLevel() {
  const { user } = useAuth();
  const { totalXP: achievementXp } = useAchievements();
  const { missions } = useMissions();
  const dailyGoals = useDailyGoals();

  const missionXp = missions.filter((m) => m.done).reduce((sum, m) => sum + m.rewardXp, 0);
  const totalXp = achievementXp + missionXp + dailyGoals.totalXp;

  const level = levelFromXp(totalXp);
  const currentLevelFloor = xpForLevel(level);
  const nextLevelFloor = xpForLevel(level + 1);
  const xpIntoLevel = totalXp - currentLevelFloor;
  const xpForNextLevel = nextLevelFloor - currentLevelFloor;
  const progressPercent = xpForNextLevel > 0
    ? Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))
    : 100;

  const lastNotifiedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) { lastNotifiedRef.current = null; return; }

    const key = levelStorageKey(user.id);
    if (lastNotifiedRef.current === null) {
      const stored = Number(localStorage.getItem(key) ?? "0");
      lastNotifiedRef.current = stored > 0 ? stored : level;
      localStorage.setItem(key, String(lastNotifiedRef.current));
      return;
    }

    if (level > lastNotifiedRef.current) {
      const previous = lastNotifiedRef.current;
      lastNotifiedRef.current = level;
      localStorage.setItem(key, String(level));
      addInboxMessage(user.id, {
        from: "StockPilot HQ",
        subject: `You've reached Level ${level}`,
        body: `Nice work — your trading, missions, and goals pushed you from Level ${previous} to Level ${level}. ${xpForNextLevel} XP to go until Level ${level + 1}.`,
        category: "level",
      });
    }
  }, [level, user, xpForNextLevel]);

  return { level, totalXp, xpIntoLevel, xpForNextLevel, progressPercent };
}
