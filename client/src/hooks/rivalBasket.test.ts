import { RIVAL_STARTING_CASH, valueRivalBasket } from "./useRivalTrader";
import { StockCompany } from "../data/mockStocks";

// The rival is an equal-weight buy-and-hold basket. Its value drives the
// head-to-head figure, the gap percentage, the taunts and the equity curve, so
// the maths is pinned here rather than only exercised through the component.

function company(symbol: string, startingPrice: number): StockCompany {
  return {
    stockId: `stock_${symbol}`,
    symbol,
    name: `${symbol} Corp`,
    sector: "Technology",
    industry: "Software",
    description: "",
    startingPrice,
    volatility: 0.02,
    trendBias: 0,
    riskLevel: "Medium",
    isActive: true,
    fundamentals: {
      peRatio: 20, eps: 5, revenueGrowth: 0.1, profitMargin: 0.2,
      debtToEquity: 0.5, dividendYield: 0.01, analystRating: "Hold",
    },
  } as StockCompany;
}

const basket = [company("AAA", 100), company("BBB", 50), company("CCC", 200), company("DDD", 25)];
const basisOf = (c: StockCompany) => c.startingPrice;

test("an unmoved market leaves the rival exactly at its starting cash", () => {
  const { total } = valueRivalBasket(basket, basisOf, (c) => c.startingPrice);
  expect(total).toBeCloseTo(RIVAL_STARTING_CASH, 6);
});

test("equal weight: each position starts as an equal slice of the cash", () => {
  const { positions } = valueRivalBasket(basket, basisOf, (c) => c.startingPrice);
  const slice = RIVAL_STARTING_CASH / basket.length;
  for (const p of positions) {
    expect(p.value).toBeCloseTo(slice, 6);
    expect(p.shares).toBeCloseTo(slice / p.basis, 6);
    expect(p.weightPct).toBeCloseTo(100 / basket.length, 6);
  }
});

test("a doubled position doubles only its own slice", () => {
  const { total, positions } = valueRivalBasket(
    basket, basisOf,
    (c) => (c.symbol === "AAA" ? c.startingPrice * 2 : c.startingPrice)
  );
  const slice = RIVAL_STARTING_CASH / basket.length;
  expect(total).toBeCloseTo(RIVAL_STARTING_CASH + slice, 6);

  const aaa = positions.find((p) => p.company.symbol === "AAA")!;
  expect(aaa.returnPct).toBeCloseTo(100, 6);
  expect(aaa.value).toBeCloseTo(slice * 2, 6);
});

test("returns are measured against the basis, not the quoted price", () => {
  const { positions } = valueRivalBasket(
    basket, basisOf,
    (c) => c.startingPrice * 0.75
  );
  for (const p of positions) expect(p.returnPct).toBeCloseTo(-25, 6);
});

test("weights always sum to 100% once prices diverge", () => {
  const { positions } = valueRivalBasket(
    basket, basisOf,
    (c) => c.startingPrice * (c.symbol === "AAA" ? 3 : c.symbol === "BBB" ? 0.4 : 1)
  );
  const sum = positions.reduce((acc, p) => acc + p.weightPct, 0);
  expect(sum).toBeCloseTo(100, 6);
});

test("an empty basket holds the cash instead of dividing by zero", () => {
  const { total, positions } = valueRivalBasket([], basisOf, () => 1);
  expect(total).toBe(RIVAL_STARTING_CASH);
  expect(positions).toEqual([]);
});

test("a zero or negative basis holds that slice as cash rather than going infinite", () => {
  for (const bad of [0, -10, Number.NaN]) {
    const { total, positions } = valueRivalBasket(
      [company("ZZZ", bad), company("AAA", 100)],
      basisOf,
      (c) => c.startingPrice
    );
    expect(Number.isFinite(total)).toBe(true);
    const slice = RIVAL_STARTING_CASH / 2;
    expect(positions[0].value).toBeCloseTo(slice, 6);
    expect(positions[0].returnPct).toBe(0);
  }
});

test("a missing quote falls back to the basis, so the slice is flat not zero", () => {
  const { total } = valueRivalBasket(basket, basisOf, () => undefined);
  expect(total).toBeCloseTo(RIVAL_STARTING_CASH, 6);
});

test("a custom starting cash scales the whole basket", () => {
  const { total } = valueRivalBasket(basket, basisOf, (c) => c.startingPrice * 1.5, 500);
  expect(total).toBeCloseTo(750, 6);
});
