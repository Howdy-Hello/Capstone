import { accountPerformance } from "./accountPerformance";
import { practiceOrder, projectInvestment } from "./investingLessons";

test("flat market bills and advisor spending reduce net worth without becoming investment losses", () => {
  const p = accountPerformance(1750, [
    { kind: "opening", amount: "2000", game_day: 1 },
    { kind: "living_cost", amount: "-150", game_day: 7 },
    { kind: "advisor", amount: "-100", game_day: 1 },
  ]);
  expect(p?.investmentGain).toBe(0);
  expect(p?.netChange).toBe(-250);
});
test("game rewards are excluded from investment gains and every amount reconciles", () => {
  const p = accountPerformance(2100, [
    { kind: "opening", amount: 2000, game_day: 1 },
    { kind: "living_cost", amount: -100, game_day: 7 },
    { kind: "reward", amount: 50, game_day: 3 },
  ])!;
  expect(p.investmentGain).toBe(150);
  expect(p.start + p.investmentGain - p.livingCosts - p.advisorCosts + p.rewards).toBe(2100);
});
test("missing tracking is unavailable instead of an estimated return", () => {
  expect(accountPerformance(1750, [])).toBeNull();
});
test("restored and older runs use their tracked opening value", () => {
  expect(accountPerformance(2300, [{ kind: "opening", amount: 2400, game_day: 12 }])).toMatchObject({ startDay: 12, investmentGain: -100 });
});
test("market fills can differ from quotes, a limit can stay unfilled, and a stop can gap", () => {
  expect(practiceOrder("market", 105, 100)).toMatchObject({ filled: true, price: 105 });
  expect(practiceOrder("limit", 105, 98)).toMatchObject({ filled: false, price: null });
  expect(practiceOrder("limit", 95, 98)).toMatchObject({ filled: true, price: 95 });
  expect(practiceOrder("stop", 85, 98)).toMatchObject({ filled: true, price: 85 });
  expect(practiceOrder("stop", 100, 98)).toMatchObject({ filled: false });
});
test("month-end contributions are separate from gains and fees reduce compounding", () => {
  expect(projectInvestment(2000, 50, 1, 0, 0)[1]).toEqual({ year: 1, balance: 2600, contributed: 2600 });
  const free = projectInvestment(2000, 50, 10, 5, 0)[10];
  const costly = projectInvestment(2000, 50, 10, 5, 2)[10];
  expect(free.contributed).toBe(8000);
  expect(costly.balance).toBeLessThan(free.balance);
});
