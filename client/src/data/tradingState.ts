import { useCallback, useEffect, useState } from "react";

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

const STARTING_CASH = 2_000;
const STORAGE_KEY = "stockpilot-trading-account";

const defaultAccount: TradingAccount = {
  cash: STARTING_CASH,
  holdings: [],
};

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function loadAccount(): TradingAccount {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultAccount;

    const parsed = JSON.parse(saved) as TradingAccount;
    if (typeof parsed.cash !== "number" || !Array.isArray(parsed.holdings)) {
      return defaultAccount;
    }

    return parsed;
  } catch {
    return defaultAccount;
  }
}

function saveAccount(account: TradingAccount) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
}

export function useTradingAccount() {
  const [account, setAccount] = useState<TradingAccount>(() => loadAccount());

  useEffect(() => {
    saveAccount(account);
  }, [account]);

  const buyStock = useCallback((stock: Stock) => {
    if (account.cash < stock.currentPrice) return false;

    setAccount((current) => {
      if (current.cash < stock.currentPrice) return current;

      const existing = current.holdings.find(
        (holding) => holding.symbol === stock.symbol
      );

      const holdings = existing
        ? current.holdings.map((holding) => {
            if (holding.symbol !== stock.symbol) return holding;

            const totalCost =
              holding.averageCost * holding.shares + stock.currentPrice;
            const shares = holding.shares + 1;

            return {
              ...holding,
              shares,
              averageCost: roundMoney(totalCost / shares),
            };
          })
        : [
            ...current.holdings,
            {
              symbol: stock.symbol,
              name: stock.name,
              shares: 1,
              averageCost: stock.currentPrice,
            },
          ];

      return {
        cash: roundMoney(current.cash - stock.currentPrice),
        holdings,
      };
    });

    return true;
  }, [account.cash]);

  const sellStock = useCallback((stock: Stock) => {
    if (getSharesOwned(account, stock.symbol) < 1) return false;

    setAccount((current) => {
      const existing = current.holdings.find(
        (holding) => holding.symbol === stock.symbol
      );

      if (!existing || existing.shares < 1) return current;

      const holdings = current.holdings
        .map((holding) =>
          holding.symbol === stock.symbol
            ? { ...holding, shares: holding.shares - 1 }
            : holding
        )
        .filter((holding) => holding.shares > 0);

      return {
        cash: roundMoney(current.cash + stock.currentPrice),
        holdings,
      };
    });

    return true;
  }, [account]);

  const resetAccount = useCallback(() => {
    setAccount(defaultAccount);
  }, []);

  return {
    account,
    buyStock,
    sellStock,
    resetAccount,
  };
}

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
