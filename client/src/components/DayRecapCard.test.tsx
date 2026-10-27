import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { MarketNews } from "../data/mockStocks";
import type { DailyGoal } from "../hooks/useDailyGoals";
import type { DayRecap } from "../lib/dayRecap";
import DayRecapCard from "./DayRecapCard";
import TodayGoalCard from "./TodayGoalCard";

jest.mock("./learning/DecisionNote", () => () => <div data-testid="decision-note" />);
jest.mock("react-router-dom", () => {
  const React = require("react");
  return { Link: React.forwardRef(({ to, ...props }: any, ref: any) => <a ref={ref} href={to} {...props} />) };
}, { virtual: true }); // v7's "main" points at a file it no longer ships

const recap: DayRecap = {
  day: 7,
  stocksChange: -10,
  stocksChangePct: -2.86,
  bill: 100,
  netWorthChange: -110,
  movers: [
    { symbol: "AAA", name: "AAA Corp", changePct: 10, change: 20 },
    { symbol: "BBB", name: "BBB Corp", changePct: -20, change: -30 },
  ],
  marketTopMover: null,
  marketAverageMovePct: 1.2,
  story: { newsId: "n2", headline: "BBB misses its sales target", relatedTickers: ["BBB"] } as unknown as MarketNews,
  rivalChange: 25.5,
};

function recapText(value: DayRecap, rival = { name: "Ava Quant", playerAhead: true, gap: 340 }) {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(<DayRecapCard recap={value} rival={rival} onOpenStock={() => {}} onDismiss={() => {}} />);
  return container.textContent ?? "";
}

const goal = (id: string, done: boolean, extra: Partial<DailyGoal> = {}): DailyGoal => ({
  id, title: `${id} title`, description: `${id} description`, current: 0, target: 1, progress: 0, done, ...extra,
});

function goalCard(goals: DailyGoal[]) {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(
    <TodayGoalCard day={7} goals={goals} completedCount={goals.filter((g) => g.done).length} error={null} onRetry={() => {}} />
  );
  return container;
}

test("the recap explains the net change, the movers, the news and the rival", () => {
  const text = recapText(recap);
  expect(text).toContain("Day 7 recap");
  expect(text).toContain("-$110.00net worth");
  expect(text).toContain("Stocks -$10.00 (-2.9%) · Living costs −$100.00");
  expect(text).toContain("BestAAA+10.0%+$20.00");
  expect(text).toContain("WorstBBB-20.0%-$30.00");
  expect(text).toContain("BBB misses its sales target");
  // −110 against the rival's +25.50.
  expect(text).toContain("Ava Quant +$25.50 today. They gained $135.50 on you. You lead by $340.00.");
});

test("a cash-only day points at the market's biggest move instead", () => {
  const text = recapText({
    ...recap, stocksChange: 0, stocksChangePct: null, bill: 0, netWorthChange: 0, movers: [], story: null, rivalChange: null,
    marketTopMover: { symbol: "CCC", name: "CCC Corp", changePct: 6.4, change: 1.2 },
  }, { name: "Ava Quant", playerAhead: false, gap: 12 });
  expect(text).toContain("You held only cash overnight");
  expect(text).toContain("Market average +1.2%");
  expect(text).toContain("Biggest moveCCC+6.4%+$1.20 a share");
  expect(text).not.toContain("Living costs");
  expect(text).not.toContain("Ava Quant");
});

test("today's goal card shows the next unfinished goal and how to do it", () => {
  const page = goalCard([goal("learn_risk", true, { kind: "risk" }), goal("learn_plan", false, { kind: "plan" }), goal("watch2", false, { target: 2, current: 1 })]);
  expect(page.textContent).toContain("1/3 done");
  expect(page.textContent).toContain("learn_plan title");
  expect(page.textContent).toContain("Record my answer");
  expect(page.querySelector('[data-testid="decision-note"]')).not.toBeNull();
  expect(page.querySelector('a[href="/game/goals"]')).not.toBeNull();
});

test("the watchlist goal says where to act, and a finished day says so", () => {
  expect(goalCard([goal("watch2", false, { target: 2, current: 1 })]).textContent)
    .toContain("Use the star on a stock row to watch it · 1/2");
  const done = goalCard([goal("learn_risk", true), goal("watch2", true)]).textContent;
  expect(done).toContain("2/2 done");
  expect(done).toContain("All of Day 7's goals are done.");
  expect(goalCard([]).textContent).toBe("");
});
