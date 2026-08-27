import { nextStreakState, StreakState } from "./useAchievements";

// The streak is stored per user, not per run. After a run reached day 30,
// lastCheckedDay stayed at 30, and the `gameDay <= lastCheckedDay` guard then
// swallowed every advance of the next run — cash_discipline and hot_streak were
// unreachable for the rest of the account's life. resetStreakForNewGame exists
// but nothing ever calls it, so the rule has to be self-healing.

const fresh: StreakState = {
  cashDisciplineStreak: 0,
  hotStreakDays: 0,
  prevNetWorth: 2000,
  lastCheckedDay: 0,
};

test("a normal advance extends both streaks", () => {
  const day1 = nextStreakState(fresh, 1, 2000, 2000)!;
  expect(day1.lastCheckedDay).toBe(1);
  expect(day1.cashDisciplineStreak).toBe(1); // 100% cash >= 20%

  const day2 = nextStreakState(day1, 2, 1000, 2500)!;
  expect(day2.cashDisciplineStreak).toBe(2);
  expect(day2.hotStreakDays).toBe(1); // 2500 > 2000
});

test("re-checking the same day is ignored", () => {
  const day5 = { ...fresh, lastCheckedDay: 5 };
  expect(nextStreakState(day5, 5, 1000, 3000)).toBeNull();
});

test("a new run after a finished one is not frozen", () => {
  // End state of a completed 30-day run.
  const finished: StreakState = {
    cashDisciplineStreak: 4,
    hotStreakDays: 3,
    prevNetWorth: 9000,
    lastCheckedDay: 30,
  };

  // New game restarts at day 1; advancing to day 2 must still count.
  const advance = nextStreakState(finished, 2, 2000, 2000);
  expect(advance).not.toBeNull();
  expect(advance!.lastCheckedDay).toBe(2);
  // Fresh run, so the counters restart rather than continuing the old run.
  expect(advance!.cashDisciplineStreak).toBe(1);
  expect(advance!.hotStreakDays).toBe(0);
  expect(advance!.prevNetWorth).toBe(2000);
});

test("the new run then accrues normally to an achievement threshold", () => {
  let state: StreakState = {
    cashDisciplineStreak: 4, hotStreakDays: 3, prevNetWorth: 9000, lastCheckedDay: 30,
  };
  let netWorth = 2000;
  for (let day = 2; day <= 7; day += 1) {
    netWorth += 100;
    state = nextStreakState(state, day, netWorth, netWorth)!;
  }
  // cash_discipline unlocks at a 5-day streak; it must be reachable again.
  expect(state.cashDisciplineStreak).toBeGreaterThanOrEqual(5);
  expect(state.hotStreakDays).toBeGreaterThanOrEqual(3);
});

test("a cash-poor day resets the discipline streak but not the day counter", () => {
  const state: StreakState = {
    cashDisciplineStreak: 3, hotStreakDays: 2, prevNetWorth: 5000, lastCheckedDay: 9,
  };
  const next = nextStreakState(state, 10, 100, 5000)!; // 2% cash
  expect(next.cashDisciplineStreak).toBe(0);
  expect(next.lastCheckedDay).toBe(10);
});

test("net worth is not divided by zero on a wiped-out account", () => {
  const next = nextStreakState(fresh, 1, 0, 0)!;
  expect(Number.isFinite(next.cashDisciplineStreak)).toBe(true);
  expect(next.cashDisciplineStreak).toBe(0);
});
