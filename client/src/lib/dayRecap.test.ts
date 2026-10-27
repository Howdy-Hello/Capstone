import type { MarketNews, Stock } from "../data/mockStocks";
import { buildDayRecap, overnightShares, positionChangeToday } from "./dayRecap";

const stock = (symbol: string, currentPrice: number, dayChange: number) => ({
  symbol,
  name: `${symbol} Corp`,
  currentPrice,
  dayChange,
  dayChangePercent: (dayChange / (currentPrice - dayChange)) * 100,
}) as Stock;

const story = (newsId: string, tickers: string[], importance = "Medium") => ({
  newsId, headline: `${newsId} headline`, relatedTickers: tickers, importance,
}) as unknown as MarketNews;

const market = [stock("AAA", 110, 10), stock("BBB", 40, -10), stock("CCC", 20, 0.5)];

test("only shares held at yesterday's close saw today's move", () => {
  expect(overnightShares("AAA", 15, { "buy:AAA": 5 })).toBe(10);
  expect(overnightShares("AAA", 7, { "sell:AAA": 3 })).toBe(10);
  expect(overnightShares("AAA", 5, { "buy:AAA": 5 })).toBe(0);
  expect(overnightShares("AAA", 10, { "sell:AAA": 10, "buy:AAA": 10 })).toBe(10);
  expect(overnightShares("AAA", 0, { "buy:AAA": 4, "sell:AAA": 2 })).toBe(0);
});

test("a position's move today leaves out shares bought today", () => {
  expect(positionChangeToday({ symbol: "AAA", shares: 15 }, market[0], { "buy:AAA": 5 })).toBe(100);
  expect(positionChangeToday({ symbol: "AAA", shares: 5 }, market[0], { "buy:AAA": 5 })).toBe(0);
  expect(positionChangeToday({ symbol: "AAA", shares: 5 }, undefined, {})).toBe(0);
});

test("no recap on the first day or before prices load", () => {
  const base = { holdings: [], tradedToday: {}, news: [], bill: 0, rivalCurve: [] };
  expect(buildDayRecap({ ...base, day: 1, stocks: market })).toBeNull();
  expect(buildDayRecap({ ...base, day: 4, stocks: [] })).toBeNull();
});

test("recaps the overnight move, bill, best and worst, related story and rival", () => {
  const recap = buildDayRecap({
    day: 7,
    // BBB was sold out today and AAA topped up; both were held overnight.
    holdings: [{ symbol: "AAA", shares: 4 }],
    tradedToday: { "buy:AAA": 2, "sell:BBB": 3 },
    stocks: market,
    news: [story("n1", ["BBB"]), story("n2", ["BBB", "CCC"], "High"), story("n3", ["AAA"], "High")],
    bill: 100,
    rivalCurve: [{ day: 6, rival: 2100 }, { day: 7, rival: 2125.5 }],
  })!;
  // AAA: 2 overnight × +10; BBB: 3 × −10.
  expect(recap.stocksChange).toBe(-10);
  expect(recap.stocksChangePct).toBeCloseTo((-10 / (2 * 100 + 3 * 50)) * 100);
  expect(recap.netWorthChange).toBe(-110);
  expect(recap.movers.map((m) => m.symbol)).toEqual(["AAA", "BBB"]);
  expect(recap.movers[1].change).toBe(-30);
  expect(recap.marketTopMover).toBeNull();
  // BBB's −$30 is the bigger dollar move; its High-importance story wins.
  expect(recap.story?.newsId).toBe("n2");
  expect(recap.rivalChange).toBe(25.5);
});

test("with only cash, the recap points at the market's biggest move", () => {
  const recap = buildDayRecap({
    day: 3, holdings: [], tradedToday: { "buy:CCC": 1 }, stocks: market,
    news: [story("n1", ["BBB"])], bill: 0, rivalCurve: [{ day: 3, rival: 2000 }],
  })!;
  expect(recap.stocksChange).toBe(0);
  expect(recap.stocksChangePct).toBeNull();
  expect(recap.movers).toEqual([]);
  expect(recap.marketTopMover?.symbol).toBe("BBB");
  expect(recap.story?.newsId).toBe("n1");
  expect(recap.rivalChange).toBeNull();
});
