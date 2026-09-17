import {
  getNewsForGameDay,
  getNewsUpToGameDay,
  getSelectedStoryArcKeys,
  getStocksForGameDay,
  hashString,
  normalizeMarketSeed,
  seededRange,
} from "./mockStocks";

// Regression guard for the continuation-price generator's randomness source.
//
// GameContext used to carry its own copy of these helpers built on a
// `hash * 31 + charCode` polynomial hash. That hash has no avalanche: two seeds
// differing only in their final character hash exactly one apart, so
// `(hash % 1_000_000) / 1_000_000` mapped consecutive game days onto values
// 0.000002 apart. Every per-day term in the generator was therefore effectively
// frozen for a whole run, and generated prices came out as a smooth curve
// instead of a random walk. These tests fail if that regresses.

const SEED = "ABC7XY";
const dayValues = (marketSeed: string, days = 400) =>
  Array.from({ length: days }, (_, index) =>
    seededRange(`shock-continuation-AAPL-${index + 1}`, -1, 1, marketSeed));

test("consecutive day seeds are decorrelated, not a near-constant ramp", () => {
  const values = dayValues(SEED);

  // Uniform over [-1, 1] has sd = 1/sqrt(3) ~= 0.577. The broken hash produced
  // an sd near zero because every day landed on essentially the same value.
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const sd = Math.sqrt(
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  );
  expect(sd).toBeGreaterThan(0.5);
  expect(Math.abs(mean)).toBeLessThan(0.1);

  // Neighbouring days must actually differ. Under the old hash every adjacent
  // gap was 0.000002; a real generator averages ~0.67 apart.
  const gaps = values.slice(1).map((v, i) => Math.abs(v - values[i]));
  const meanGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
  expect(meanGap).toBeGreaterThan(0.3);
});

test("different market seeds produce different price streams", () => {
  const a = dayValues("ABC7XY", 60);
  const b = dayValues("QQ42ZK", 60);
  const identical = a.filter((value, index) => value === b[index]).length;
  expect(identical).toBe(0);
});

test("the same market seed is reproducible", () => {
  expect(dayValues(SEED, 40)).toEqual(dayValues(SEED, 40));
});

test("seed normalisation is stable and case-insensitive", () => {
  expect(normalizeMarketSeed("abc7xy")).toBe("ABC7XY");
  expect(normalizeMarketSeed("abc-7xy")).toBe("ABC7XY");
  expect(normalizeMarketSeed("")).toBe(normalizeMarketSeed(null));
});

test("hashString avalanches on a single-character change", () => {
  // The old polynomial hash returned values exactly 1 apart here.
  const a = hashString("shock-continuation-AAPL-41");
  const b = hashString("shock-continuation-AAPL-42");
  expect(Math.abs(a - b)).toBeGreaterThan(1_000);
});

test("opening news predicts the following session instead of explaining an existing move", () => {
  const day1 = getStocksForGameDay(1, SEED).find((stock) => stock.symbol === "CAI");
  const day2 = getStocksForGameDay(2, SEED).find((stock) => stock.symbol === "CAI");
  const day3 = getStocksForGameDay(3, SEED).find((stock) => stock.symbol === "CAI");
  const day1News = getNewsForGameDay(1, SEED).find((item) => item.relatedTickers.includes("CAI"));
  const day2News = getNewsForGameDay(2, SEED).find((item) => item.relatedTickers.includes("CAI"));
  const day3News = getNewsForGameDay(3, SEED).find((item) => item.relatedTickers.includes("CAI"));

  expect(day1?.dayChangePercent).toBe(0);
  expect(day1?.eventImpact).toBe(0);
  expect(day2?.dayChangePercent).toBeGreaterThan(0);
  expect(day2?.eventImpact).toBe(Number(day1News?.actualImpact.toFixed(2)));
  expect(day3?.dayChangePercent).toBeLessThan(0);
  expect(day1News?.marketTone).toBe("Bullish");
  expect(day2News?.marketTone).toBe("Bearish");
  expect(day3News?.headline).toContain("stabilizes");
});

test("news exposes useful forecast metadata without exact future returns", () => {
  const news = getNewsUpToGameDay(30, SEED);
  expect(news.length).toBeGreaterThan(20);
  expect(news.every((item) => item.confidence && item.horizon && item.affectedSectors)).toBe(true);
  expect(news.some((item) => item.followUpTo)).toBe(true);
  expect(news.some((item) => item.arcKey && item.branch)).toBe(true);
});

test("a run selects a focused mix from the expanded story-arc pool", () => {
  const arcs = getSelectedStoryArcKeys(SEED);
  expect(arcs.length).toBeGreaterThanOrEqual(2);
  expect(arcs.length).toBeLessThanOrEqual(4);
  expect(new Set(arcs).size).toBe(arcs.length);
});
