import { buildMarketPrelude, FIRST_MARKET_DAY, formatMarketDay, MARKET_PRELUDE_DAYS } from "./marketPrelude";
import { mockStockCompanies, StockCompany } from "./mockStocks";
import { buildMarketHistory } from "./marketHistory";
import { historyFromRows } from "./sessionMarket";

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

test("Day 1 is a complete random candle continuing the prelude, without simulating player turns", () => {
  const { prices, firstDayPrices } = buildMarketPrelude(stocks, "ABC123");
  expect(firstDayPrices).toHaveLength(stocks.length);
  for (const point of firstDayPrices) {
    const yesterday = prices.find((row) => row.symbol === point.symbol && row.game_day === 0)!;
    expect(point.game_day).toBe(1);
    expect(point.open_price).toBe(yesterday.close_price);
    expect(point.close_price).not.toBe(point.open_price);
    expect(point.high_price).toBeGreaterThanOrEqual(Math.max(point.open_price, point.close_price));
    expect(point.low_price).toBeLessThanOrEqual(Math.min(point.open_price, point.close_price));
    expect(point.volume).toBeGreaterThan(0);
    expect(point.event_impact).toBe(0);
  }
});

test.each(["ABC123", "DEF456", "VARIETY42"])("%s gives the market index varied bodies, ranges and asymmetric wicks", (seed) => {
  const active = mockStockCompanies.filter((stock) => stock.isActive);
  const { prices, firstDayPrices } = buildMarketPrelude(active, seed);
  const rows = [...prices, ...firstDayPrices];
  const candles = buildMarketHistory(active, (symbol) => historyFromRows(rows.filter((row) => row.symbol === symbol)), 1);
  const moves = candles.map((point) => (point.closePrice - point.openPrice) / point.openPrice);
  const ranges = candles.map((point) => (point.highPrice - point.lowPrice) / point.openPrice);
  expect(candles).toHaveLength(16);
  expect(moves.some((move) => move < 0)).toBe(true);
  expect(moves.some((move) => move > 0)).toBe(true);
  expect(Math.abs(moves[15])).toBeGreaterThan(0.0001);
  expect(Math.max(...ranges)).toBeGreaterThan(Math.min(...ranges) * 3);
  expect(Math.max(...moves.map(Math.abs))).toBeGreaterThan(Math.min(...moves.map(Math.abs)) * 4);
  expect(candles.some((point) => Math.abs(
    (point.highPrice - Math.max(point.openPrice, point.closePrice))
      - (Math.min(point.openPrice, point.closePrice) - point.lowPrice)
  ) > 0.1)).toBe(true);
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
  expect(buildMarketPrelude([], "ABC123")).toEqual({ prices: [], news: [], firstDayPrices: [] });
  const invalid = [0, -1, NaN, Infinity].map((startingPrice) => ({ ...stocks[0], startingPrice }));
  expect(buildMarketPrelude(invalid, "ABC123")).toEqual({ prices: [], news: [], firstDayPrices: [] });
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
