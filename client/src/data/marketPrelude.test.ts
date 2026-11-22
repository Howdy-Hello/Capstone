import { buildMarketPrelude, FIRST_MARKET_DAY, formatMarketDay, MARKET_PRELUDE_DAYS } from "./marketPrelude";
import { StockCompany } from "./mockStocks";

const stocks: Pick<StockCompany, "symbol" | "startingPrice" | "volatility" | "riskLevel">[] = ["AAA", "BBB", "CCC"].map((symbol, index) => ({
  symbol, startingPrice: 20 + index * 30, volatility: 0.03, riskLevel: "Medium",
}));

test("simulates exactly 15 days forward without pulling prices back to their starting values", () => {
  const original = JSON.parse(JSON.stringify(stocks));
  const { prices } = buildMarketPrelude(stocks, "infinite:ABC123");
  expect(prices).toHaveLength(stocks.length * MARKET_PRELUDE_DAYS);
  for (const stock of stocks) {
    const history = prices.filter((row) => row.symbol === stock.symbol).sort((a, b) => a.game_day - b.game_day);
    expect(history.map((row) => row.game_day)).toEqual(Array.from({ length: 15 }, (_, i) => FIRST_MARKET_DAY + i));
    expect(history[0].open_price).toBe(stock.startingPrice);
    expect(history[14].close_price).not.toBe(stock.startingPrice);
    history.forEach((row, index) => {
      if (index > 0) expect(row.open_price).toBe(history[index - 1].close_price);
      expect(row.high_price).toBeGreaterThanOrEqual(Math.max(row.open_price, row.close_price));
      expect(row.low_price).toBeLessThanOrEqual(Math.min(row.open_price, row.close_price));
      expect(row.low_price).toBeGreaterThan(0);
      expect(row.volume).toBeGreaterThan(0);
      expect(row.event_impact).toBe(0);
    });
  }
  expect(stocks).toEqual(original);
});

test("is stable across reloads and varies by seed", () => {
  const first = buildMarketPrelude(stocks, "limited_30:ABC123");
  expect(buildMarketPrelude(stocks, "limited_30:ABC123")).toEqual(first);
  expect(buildMarketPrelude(stocks, "limited_30:DEF456")).not.toEqual(first);
  expect(buildMarketPrelude(stocks, "infinite:ABC123")).not.toEqual(first);
});

test("includes only three standalone, completed-session recaps that match their candles", () => {
  const { prices, news } = buildMarketPrelude(stocks, "infinite:ABC123");
  expect(news.map((item) => item.gameDay)).toEqual([0, -5, -10]);
  for (const item of news) {
    const candle = prices.find((row) => row.game_day === item.gameDay && row.symbol === item.relatedTickers[0])!;
    expect(item.body).toContain(`$${candle.close_price.toFixed(2)}`);
    expect(item.body).toContain(`$${candle.open_price.toFixed(2)}`);
    expect(item.headline).toContain(candle.close_price >= candle.open_price ? "up" : "down");
    expect(item.arcKey).toBeUndefined();
    expect(item.followUpTo).toBeUndefined();
    expect(item.branch).toBeUndefined();
    expect(item.actualImpact).toBe(0);
    expect(item.expectedImpact).toBe(0);
  }
});

test("handles absent and invalid opening prices without inventing playable prices", () => {
  expect(buildMarketPrelude([], "ABC123")).toEqual({ prices: [], news: [] });
  const invalid = [0, -1, NaN, Infinity].map((startingPrice) => ({ ...stocks[0], startingPrice }));
  expect(buildMarketPrelude(invalid, "ABC123")).toEqual({ prices: [], news: [] });
  const cheap = buildMarketPrelude([{ ...stocks[0], startingPrice: 0.01 }], "ABC123");
  expect(cheap.prices).toHaveLength(15);
  expect(cheap.prices.every((row) => row.low_price > 0)).toBe(true);
});

test("uses calendar dates across the history, playable days and year boundaries", () => {
  const start = "2026-01-16T23:30:00Z";
  expect(formatMarketDay(FIRST_MARKET_DAY, start)).toBe("Jan 1, 2026");
  expect(formatMarketDay(0, start)).toBe("Jan 15, 2026");
  expect(formatMarketDay(1, start)).toBe("Jan 16, 2026");
  expect(formatMarketDay(30, start)).toBe("Feb 14, 2026");
  expect(formatMarketDay(0, "2026-01-01")).toBe("Dec 31, 2025");
  expect(formatMarketDay(2, "2028-02-28")).toBe("Feb 29, 2028");
});
