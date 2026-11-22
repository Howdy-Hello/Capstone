import { buildMarketHistory, MARKET_CHART_DAYS } from "./marketHistory";

function prices(gameDay: number, openPrice: number, highPrice: number, lowPrice: number, closePrice: number) {
  return { gameDay, openPrice, highPrice, lowPrice, closePrice };
}

test("each ticker has equal weight and each candle opens at the previous index close", () => {
  const histories: Record<string, ReturnType<typeof prices>[]> = {
    LOW: [prices(1, 10, 13, 9, 12), prices(2, 12, 14, 11, 12)],
    HIGH: [prices(1, 100, 110, 95, 100), prices(2, 100, 124, 97, 120)],
  };

  const [first, second] = buildMarketHistory([{ symbol: "LOW" }, { symbol: "HIGH" }], (symbol) => histories[symbol], 2);

  expect(first.openPrice).toBe(100);
  expect(first.highPrice).toBeCloseTo(120);
  expect(first.lowPrice).toBeCloseTo(92.5);
  expect(first.closePrice).toBeCloseTo(110);
  expect(second.openPrice).toBe(first.closePrice);
  expect(second.closePrice).toBeCloseTo(121);
});

test("the chart contains only recent days up to the displayed game day", () => {
  const gameDay = 45;
  const history = Array.from({ length: gameDay + 1 }, (_, day) => prices(day + 1, 10, 10, 10, 10));
  const market = buildMarketHistory([{ symbol: "LOW" }], () => history, gameDay);

  expect(market).toHaveLength(MARKET_CHART_DAYS);
  expect(market[0]).toEqual(prices(gameDay - MARKET_CHART_DAYS + 1, 100, 100, 100, 100));
  expect(market[market.length - 1]).toEqual(prices(gameDay, 100, 100, 100, 100));
  expect(buildMarketHistory([], () => history, gameDay)).toEqual([]);
});

test("Day 1 includes the market prelude and never includes tomorrow", () => {
  const history = Array.from({ length: 17 }, (_, i) => prices(i - 14, 10, 11, 9, 10));
  const market = buildMarketHistory([{ symbol: "LOW" }], () => history, 1);
  expect(market).toHaveLength(16);
  expect(market[0].gameDay).toBe(-14);
  expect(market[15].gameDay).toBe(1);
});
