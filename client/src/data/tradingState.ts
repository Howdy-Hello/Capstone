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
};

export function getSharesOwned(account: TradingAccount, symbol: string) {
  return (
    account.holdings.find((holding) => holding.symbol === symbol)?.shares ?? 0
  );
}

export function getPortfolioValue(account: TradingAccount, stocks: Stock[]) {
  return account.holdings.reduce((total, holding) => {
    const stock = stocks.find((item) => item.symbol === holding.symbol);
    return total + (stock ? stock.currentPrice * holding.shares : 0);
  }, 0);
}

export function getNetWorth(account: TradingAccount, stocks: Stock[]) {
  return account.cash + getPortfolioValue(account, stocks);
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
