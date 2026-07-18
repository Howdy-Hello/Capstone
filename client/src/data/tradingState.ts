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
