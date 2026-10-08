import { Stock } from "./mockStocks";

export type PortfolioHolding = {
  symbol: string;
  name: string;
  shares: number;
  averageCost: number;
};

export type TradingAccount = {
  cash: number;
  holdings: PortfolioHolding[];
  /** Living costs cash couldn't cover; collected on the next advance. */
  unpaidBills?: number;
};

export function getSharesOwned(account: TradingAccount, symbol: string) {
  return (
    account.holdings.find((holding) => holding.symbol === symbol)?.shares ?? 0
  );
}

export function getPortfolioValue(account: TradingAccount, stocks: Stock[]) {
  return account.holdings.reduce((total, holding) => {
    const stock = stocks.find((item) => item.symbol === holding.symbol);
    // Cost basis when the price is missing, as recompute_session_value does (BUG-024).
    return total + (stock ? stock.currentPrice : holding.averageCost) * holding.shares;
  }, 0);
}

// Unpaid bills count as a debt, matching recompute_session_value (202610060003).
export function getNetWorth(account: TradingAccount, stocks: Stock[]) {
  return Math.max(0, account.cash + getPortfolioValue(account, stocks) - (account.unpaidBills ?? 0));
}

// ── Anti-snowball: diminishing returns on oversized trades ────────────────
// A single trade worth more than SLIPPAGE_THRESHOLD of net worth starts
// getting a worse fill — buys cost more, sells return less — so a player
// can't compound a lead by dumping their whole stack into one position each
// day. Below the threshold there's no penalty at all.
const SLIPPAGE_THRESHOLD = 0.15; // fraction of net worth before slippage kicks in
const SLIPPAGE_SLOPE = 0.55;     // how quickly the penalty grows past the threshold
const MAX_SLIPPAGE = 0.12;       // hard cap so it never becomes unplayable

export function getTradeSlippage(tradeValue: number, netWorth: number) {
  if (netWorth <= 0 || tradeValue <= 0) return 0;
  const ratio = tradeValue / netWorth;
  if (ratio <= SLIPPAGE_THRESHOLD) return 0;
  return Math.min(MAX_SLIPPAGE, (ratio - SLIPPAGE_THRESHOLD) * SLIPPAGE_SLOPE);
}

/**
 * Largest quantity whose slippage-adjusted total still fits in `cash`.
 *
 * Dividing cash by the base price does not work: spending the whole balance is
 * ~100% of net worth, far past SLIPPAGE_THRESHOLD, so `floor(cash / price)`
 * always costs more than the cash on hand and a "Max" button built on it
 * produces a quantity the player cannot actually buy.
 *
 * `totalFor` is the caller's quote function; its total is non-decreasing in
 * quantity (effectivePrice is non-decreasing and quantity rises), so the
 * largest affordable quantity can be found by binary search. Returns 0 when not
 * even one share is affordable -- callers that need a usable stepper should
 * clamp to 1 and let their own affordability check disable the confirm action.
 */
export function getMaxAffordableQuantity(
  cash: number,
  basePrice: number,
  totalFor: (quantity: number) => number
) {
  if (!(cash > 0) || !(basePrice > 0)) return 0;
  const ceiling = Math.floor(cash / basePrice);
  if (ceiling < 1) return 0;

  let low = 1;
  let high = ceiling;
  let best = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (totalFor(mid) <= cash) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}

export function getSlippageAdjustedPrice(
  basePrice: number,
  tradeType: "buy" | "sell",
  tradeValue: number,
  netWorth: number
) {
  const slippage = getTradeSlippage(tradeValue, netWorth);
  if (slippage <= 0) return basePrice;
  return tradeType === "buy"
    ? basePrice * (1 + slippage)
    : basePrice * (1 - slippage);
}

/**
 * Cash paid for (buy) or received from (sell) `quantity` shares after
 * slippage. Mirrors public.slipped_trade_value (202610080005).
 */
export function getSlippedTradeValue(
  basePrice: number,
  quantity: number,
  netWorth: number,
  tradeType: "buy" | "sell"
) {
  const value = basePrice * quantity;
  const slippage = getTradeSlippage(value, netWorth);
  return value * (tradeType === "buy" ? 1 + slippage : 1 - slippage);
}

/**
 * Total for the next order when `priorQuantity` shares of this stock were
 * already traded on the same side today. Slippage applies to the day's
 * cumulative quantity, so splitting an order doesn't avoid it (BUG-016).
 * Rounded to cents like execute_trade.
 */
export function getCumulativeTradeTotal(
  basePrice: number,
  priorQuantity: number,
  quantity: number,
  netWorth: number,
  tradeType: "buy" | "sell"
) {
  const after = getSlippedTradeValue(basePrice, priorQuantity + quantity, netWorth, tradeType);
  const before = getSlippedTradeValue(basePrice, priorQuantity, netWorth, tradeType);
  return Math.round((after - before) * 100) / 100;
}
