import {
  getMaxAffordableQuantity,
  getNetWorth,
  getSlippageAdjustedPrice,
  getTradeSlippage,
  getCumulativeTradeTotal,
  getPortfolioValue,
} from "./tradingState";

// The "Max" buttons used to divide cash by the *base* price. Spending the whole
// balance is ~100% of net worth, far past the 15% slippage threshold, so the
// quantity that produced always cost more than the cash on hand and the confirm
// button rendered permanently disabled. These pin the corrected behaviour.

// Mirrors GameContext.getTradeQuote for a player who is all cash.
const quoteTotal = (cash: number, price: number) => (quantity: number) => {
  const netWorth = cash;
  const effective = getSlippageAdjustedPrice(price, "buy", price * quantity, netWorth);
  return effective * quantity;
};

test("max quantity is actually affordable once slippage applies", () => {
  const cash = 2000;
  const price = 100;
  const total = quoteTotal(cash, price);

  // The old, broken value.
  const naive = Math.floor(cash / price); // 20
  expect(total(naive)).toBeGreaterThan(cash);

  const max = getMaxAffordableQuantity(cash, price, total);
  expect(max).toBeGreaterThan(0);
  expect(max).toBeLessThan(naive);
  expect(total(max)).toBeLessThanOrEqual(cash);
  // ...and it is the largest such quantity.
  expect(total(max + 1)).toBeGreaterThan(cash);
});

test("holds across a spread of balances and prices", () => {
  for (const cash of [50, 137.5, 2000, 25_000, 1_000_000]) {
    for (const price of [1.25, 37, 100, 199.99]) {
      const total = quoteTotal(cash, price);
      const max = getMaxAffordableQuantity(cash, price, total);
      if (max === 0) {
        expect(total(1)).toBeGreaterThan(cash);
        continue;
      }
      expect(total(max)).toBeLessThanOrEqual(cash);
      expect(total(max + 1)).toBeGreaterThan(cash);
    }
  }
});

test("returns 0 when not even one share is affordable", () => {
  expect(getMaxAffordableQuantity(10, 100, quoteTotal(10, 100))).toBe(0);
});

test("quotes round each share like the database before checking affordability", () => {
  expect(getSlippageAdjustedPrice(37.19, "buy", 37.19 * 25, 2000)).toBe(41.65);
  expect(getSlippageAdjustedPrice(37.19, "sell", 37.19 * 25, 2000)).toBe(32.73);
  const cash = 333.2;
  const total = (q: number) => Number((getSlippageAdjustedPrice(37.19, "buy", 37.19 * q, cash) * q).toFixed(2));
  expect(total(8)).toBe(cash);
  expect(getMaxAffordableQuantity(cash, 37.19, total)).toBe(8);
});

test("rejects degenerate inputs instead of returning Infinity or NaN", () => {
  expect(getMaxAffordableQuantity(0, 100, () => 0)).toBe(0);
  expect(getMaxAffordableQuantity(-5, 100, () => 0)).toBe(0);
  expect(getMaxAffordableQuantity(1000, 0, () => 0)).toBe(0);
  expect(getMaxAffordableQuantity(1000, -1, () => 0)).toBe(0);
});

test("small trades take no slippage, so max equals the naive divide there", () => {
  // Trade value under 15% of net worth: no penalty, so the two agree.
  const cash = 100_000;
  const price = 100;
  const total = (q: number) =>
    getSlippageAdjustedPrice(price, "buy", price * q, cash) * q;
  expect(getTradeSlippage(price * 10, cash)).toBe(0);
  expect(getMaxAffordableQuantity(cash, price, total)).toBeLessThanOrEqual(
    Math.floor(cash / price)
  );
});

// BUG-008: bills cash couldn't cover are a debt, as on the server.
test("unpaid bills count against net worth, never below zero", () => {
  const stocks = [{ symbol: "CAI", currentPrice: 50 }] as any;
  const holdings = [{ symbol: "CAI", name: "Closed Ai", shares: 10, averageCost: 40 }];
  expect(getNetWorth({ cash: 0, holdings }, stocks)).toBe(500);
  expect(getNetWorth({ cash: 0, holdings, unpaidBills: 300 }, stocks)).toBe(200);
  expect(getNetWorth({ cash: 0, holdings, unpaidBills: 900 }, stocks)).toBe(0);
});

describe("getCumulativeTradeTotal (BUG-016, BUG-024)", () => {
  it("charges the same for one order as for the same shares split in two", () => {
    const whole = getCumulativeTradeTotal(100, 0, 12, 2000, "buy");
    const split = getCumulativeTradeTotal(100, 0, 6, 2000, "buy") + getCumulativeTradeTotal(100, 6, 6, 2000, "buy");
    expect(whole).toBe(1344); // 60% of net worth -> 12% cap
    expect(split).toBeCloseTo(whole, 2);
  });

  it("rounds to cents like execute_trade", () => {
    const total = getCumulativeTradeTotal(33.333, 0, 7, 100000, "sell");
    expect(total).toBe(233.33);
  });

  it("values a holding without a price at cost basis", () => {
    const account = { cash: 0, holdings: [{ symbol: "GONE", name: "Gone", shares: 3, averageCost: 10.5 }] };
    expect(getPortfolioValue(account, [])).toBe(31.5);
  });
});
