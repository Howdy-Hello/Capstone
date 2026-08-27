import { getPlayerLevel, getTotalXpForLevel, getXpRequirement } from "./levelSystem";

// useLevel used to carry its own `100 * (level - 1) ^ 1.5` curve over a wider XP
// base (achievements + missions + daily goals), while Header, Level, Achievements,
// the Leaderboard badge and Game's progression card all used getPlayerLevel over
// achievement XP alone. Game.tsx rendered both at once, so the same account read
// two different levels on one screen — and only getPlayerLevel matches the
// server, which is what pays the level cash reward. These tests pin the single
// curve and its agreement with the SQL.

// Faithful port of supabase player_level_from_xp (202607310002).
function sqlPlayerLevelFromXp(targetXp: number): number {
  let remaining = Math.max(0, targetXp);
  let level = 1;
  let previous = 100;
  let current = 100;

  while (remaining >= current) {
    remaining -= current;
    level += 1;
    if (level === 2) {
      previous = 100;
      current = 150;
    } else {
      const next = previous + current;
      previous = current;
      current = next;
    }
  }
  return level;
}

test("the client curve matches the server's player_level_from_xp", () => {
  for (let xp = 0; xp <= 20_000; xp += 7) {
    expect(getPlayerLevel(xp).level).toBe(sqlPlayerLevelFromXp(xp));
  }
});

test("matches at every exact level boundary", () => {
  for (let level = 1; level <= 15; level += 1) {
    const floorXp = getTotalXpForLevel(level);
    expect(getPlayerLevel(floorXp).level).toBe(level);
    expect(sqlPlayerLevelFromXp(floorXp)).toBe(level);
    if (floorXp > 0) {
      expect(getPlayerLevel(floorXp - 1).level).toBe(level - 1);
      expect(sqlPlayerLevelFromXp(floorXp - 1)).toBe(level - 1);
    }
  }
});

test("requirements follow the documented Fibonacci-style curve", () => {
  expect([1, 2, 3, 4, 5, 6].map(getXpRequirement)).toEqual([100, 150, 250, 400, 650, 1050]);
});

test("xpIntoLevel and xpForNextLevel are consistent", () => {
  for (const xp of [0, 99, 100, 249, 250, 500, 1234, 9999]) {
    const p = getPlayerLevel(xp);
    expect(p.xpIntoLevel).toBeGreaterThanOrEqual(0);
    expect(p.xpIntoLevel).toBeLessThan(p.xpForNextLevel);
    expect(p.xpForNextLevel).toBe(getXpRequirement(p.level));
    expect(getTotalXpForLevel(p.level) + p.xpIntoLevel).toBe(xp);
    expect(p.progress).toBeGreaterThanOrEqual(0);
    expect(p.progress).toBeLessThanOrEqual(100);
  }
});

test("degenerate XP does not produce NaN or an infinite loop", () => {
  expect(getPlayerLevel(-500).level).toBe(1);
  expect(getPlayerLevel(NaN).level).toBe(1);
  expect(getPlayerLevel(0).level).toBe(1);
});
