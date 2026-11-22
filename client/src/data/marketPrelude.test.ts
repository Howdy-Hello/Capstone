import { buildMarketPrelude, FIRST_MARKET_DAY, formatMarketDay, MARKET_PRELUDE_DAYS } from "./marketPrelude";
import { SessionPriceRow } from "./sessionMarket";

const openings: SessionPriceRow[] = ["AAA", "BBB", "CCC"].map((symbol, index) => ({
  game_day: 1, symbol, open_price: 20 + index * 30, high_price: 100,
  low_price: 10, close_price: 30 + index * 30, volume: 1000, event_impact: 0,
}));

test("builds exactly 15 historical candles per stock, joined to the stored Day 1 open", () => {
  const original = JSON.parse(JSON.stringify(openings));
  const { prices } = buildMarketPrelude(openings, "infinite:ABC123");
  expect(prices).toHaveLength(openings.length * MARKET_PRELUDE_DAYS);
  for (const opening of openings) {
    const history = prices.filter((row) => row.symbol === opening.symbol).sort((a, b) => a.game_day - b.game_day);
    expect(history.map((row) => row.game_day)).toEqual(Array.from({ length: 15 }, (_, i) => FIRST_MARKET_DAY + i));
    expect(history[14].close_price).toBe(opening.open_price);
    history.forEach((row, index) => {
      if (index > 0) expect(row.open_price).toBe(history[index - 1].close_price);
      expect(row.high_price).toBeGreaterThanOrEqual(Math.max(row.open_price, row.close_price));
      expect(row.low_price).toBeLessThanOrEqual(Math.min(row.open_price, row.close_price));
      expect(row.low_price).toBeGreaterThan(0);
      expect(row.volume).toBeGreaterThan(0);
      expect(row.event_impact).toBe(0);
    });
  }
  expect(openings).toEqual(original);
});

test("is stable across reloads and later days, and varies by mode and seed", () => {
  const first = buildMarketPrelude(openings, "limited_30:ABC123");
  expect(buildMarketPrelude([...openings, { ...openings[0], game_day: 2 }], "limited_30:ABC123")).toEqual(first);
  expect(buildMarketPrelude(openings, "limited_30:DEF456")).not.toEqual(first);
  expect(buildMarketPrelude(openings, "infinite:ABC123")).not.toEqual(first);
});

test("includes only three standalone, completed-session recaps that match their candles", () => {
  const { prices, news } = buildMarketPrelude(openings, "infinite:ABC123");
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
  const invalid = [0, -1, NaN, Infinity].map((open_price) => ({ ...openings[0], open_price }));
  expect(buildMarketPrelude(invalid, "ABC123")).toEqual({ prices: [], news: [] });
  const cheap = buildMarketPrelude([{ ...openings[0], open_price: 0.01 }], "ABC123");
  expect(cheap.prices).toHaveLength(15);
  expect(cheap.prices.every((row) => row.low_price > 0)).toBe(true);
});

test("formats historical timeline ticks without changing the player's day or adding a history label", () => {
  expect(formatMarketDay(FIRST_MARKET_DAY)).toBe("−15d");
  expect(formatMarketDay(0)).toBe("−1d");
  expect(formatMarketDay(1)).toBe("Day 1");
  expect(formatMarketDay(30)).toBe("Day 30");
});
