import { useEffect, useRef } from "react";

import { useAuth } from "../context/AuthContext";
import { useAchievements } from "./useAchievements";
import { getPlayerLevel } from "../data/levelSystem";
import { addInboxMessage } from "../lib/inbox";

// The player level, derived from the SAME curve and the SAME XP base as
// everything else that shows a level.
//
// This hook used to carry a private `100 * (level - 1) ^ 1.5` curve and add
// mission and daily-goal XP on top of achievement XP, while Header.tsx,
// Level.tsx, the Achievements page, the Leaderboard badge and Game.tsx's
// progression card all used getPlayerLevel()'s Fibonacci curve over achievement
// XP alone. The two disagreed on screen at the same time (Game.tsx rendered
// both at once) and only getPlayerLevel matches the server's
// player_level_from_xp, which is what pays the level cash reward -- so this
// hook was emailing "You've reached Level 14" for a level the server would
// never pay out.
//
// Achievement XP is the base because that is what the server's player_total_xp
// counts. Widening the server side to include missions and daily goals instead
// would retroactively jump every existing player's level and make
// process_level_cash_rewards pay a lump sum for levels they never played.
function levelStorageKey(userId: string) {
  return `stockpilot-last-level-${userId}`;
}

export function useLevel() {
  const { user } = useAuth();
  const { totalXP: achievementXp } = useAchievements();

  const player = getPlayerLevel(achievementXp);
  const { level, totalXp, xpIntoLevel, xpForNextLevel } = player;
  const progressPercent = player.progress;

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
        id: `level-${level}`,
        from: "StockPilot HQ",
        subject: `You've reached Level ${level}`,
        // xpForNextLevel is the SIZE of the level band, not the remainder --
        // reporting it directly overstated the gap by however much of the band
        // the player had already earned.
        body: `Nice work — your achievements pushed you from Level ${previous} to Level ${level}. ${Math.max(0, xpForNextLevel - xpIntoLevel)} XP to go until Level ${level + 1}.`,
        category: "level",
      });
    }
  }, [level, user, xpForNextLevel, xpIntoLevel]);

  return { level, totalXp, xpIntoLevel, xpForNextLevel, progressPercent };
}
