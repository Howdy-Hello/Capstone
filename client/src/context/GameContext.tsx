import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";

import {
  MarketNews,
  normalizeGameDay,
  Stock,
  StockPriceHistory,
} from "../data/mockStocks";
import {
  getPortfolioValue,
  PortfolioHolding,
  TradingAccount,
} from "../data/tradingState";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

const STARTING_CASH = 2_000;
const GAME_DAY_STORAGE_KEY = "stockpilot-current-game-day";

type DatabaseStock = {
  id: number;
  symbol: string;
  company_name: string;
  sector: string;
  industry: string;
  description: string;
  initial_price: number | string;
  current_price: number | string;
  volatility: number | string;
  trend_bias: number | string;
  risk_level: Stock["riskLevel"];
  pe_ratio: number | string;
  eps: number | string;
  revenue_growth: number | string;
  profit_margin: number | string;
  debt_to_equity: number | string;
  dividend_yield: number | string;
  analyst_rating: Stock["fundamentals"]["analystRating"];
  is_active: boolean;
};

type DatabaseEventImpact = {
  expected_impact: number | string;
  actual_impact: number | string;
  stocks: { symbol: string } | { symbol: string }[] | null;
};

type DatabaseEvent = {
  id: number;
  event_key: string;
  game_day: number;
  source: string;
  headline: string;
  body: string;
  importance: MarketNews["importance"];
  category: MarketNews["category"];
  is_accurate: boolean;
  is_rumor: boolean;
  event_stock_impacts: DatabaseEventImpact[];
};

type DatabasePrice = {
  id: number;
  game_day: number;
  open_price: number | string;
  high_price: number | string;
  low_price: number | string;
  close_price: number | string;
  volume: number | string;
  event_impact: number | string;
  stocks: { symbol: string } | { symbol: string }[] | null;
};

type GameSession = {
  id: string;
  current_day: number;
  cash_balance: number | string;
};

type TradeResult = {
  cash: number | string;
  symbol: string;
  quantity: number;
  average_purchase_price: number | string;
};

type GameContextValue = {
  account: TradingAccount;
  buyStock: (stock: Stock) => Promise<boolean>;
  sellStock: (stock: Stock) => Promise<boolean>;
  resetAccount: () => Promise<void>;
  setCash: (cash: number) => Promise<void>;
  addCash: (amount: number) => Promise<void>;
  setHolding: (stock: Stock, shares: number) => Promise<void>;
  gameDay: number;
  setGameDay: (day: number | ((current: number) => number)) => void;
  stocks: Stock[];
  news: MarketNews[];
  getStock: (symbol: string) => Stock | undefined;
  getHistory: (symbol: string) => StockPriceHistory[];
  getRelatedNews: (symbol: string) => MarketNews[];
  loading: boolean;
  error: string | null;
};

const defaultAccount: TradingAccount = {
  cash: STARTING_CASH,
  holdings: [],
};

const GameContext = createContext<GameContextValue | undefined>(undefined);

function asNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function relatedSymbol(
  relation: { symbol: string } | { symbol: string }[] | null
) {
  if (Array.isArray(relation)) return relation[0]?.symbol;
  return relation?.symbol;
}

function mapDatabaseStock(
  row: DatabaseStock,
  today: DatabasePrice | undefined,
  yesterday: DatabasePrice | undefined
): Stock {
  const startingPrice = asNumber(row.initial_price);
  const currentPrice = today
    ? asNumber(today.close_price)
    : asNumber(row.current_price);
  const previousPrice = yesterday
    ? asNumber(yesterday.close_price)
    : startingPrice;
  const dayChange = currentPrice - previousPrice;

  return {
    stockId: `stock_${row.id}`,
    symbol: row.symbol,
    name: row.company_name,
    sector: row.sector,
    industry: row.industry,
    description: row.description,
    startingPrice,
    volatility: asNumber(row.volatility),
    trendBias: asNumber(row.trend_bias),
    riskLevel: row.risk_level,
    isActive: row.is_active,
    fundamentals: {
      peRatio: asNumber(row.pe_ratio),
      eps: asNumber(row.eps),
      revenueGrowth: asNumber(row.revenue_growth),
      profitMargin: asNumber(row.profit_margin),
      debtToEquity: asNumber(row.debt_to_equity),
      dividendYield: asNumber(row.dividend_yield),
      analystRating: row.analyst_rating,
    },
    currentPrice,
    previousPrice,
    dayChange,
    dayChangePercent: previousPrice > 0 ? (dayChange / previousPrice) * 100 : 0,
    volume: today ? asNumber(today.volume) : 0,
    eventImpact: today ? asNumber(today.event_impact) : 0,
  };
}

function mapDatabaseEvent(row: DatabaseEvent): MarketNews {
  const impacts = row.event_stock_impacts ?? [];

  return {
    newsId: row.event_key,
    gameDay: row.game_day,
    source: row.source,
    headline: row.headline,
    body: row.body,
    importance: row.importance,
    marketTone: "Unclear",
    relatedTickers: impacts
      .map((impact) => relatedSymbol(impact.stocks))
      .filter((symbol): symbol is string => Boolean(symbol)),
    expectedImpact: impacts[0] ? asNumber(impacts[0].expected_impact) : 0,
    actualImpact: impacts[0] ? asNumber(impacts[0].actual_impact) : 0,
    isAccurate: row.is_accurate,
    isRumor: row.is_rumor,
    category: row.category,
  };
}

function mapDatabasePrice(row: DatabasePrice, symbol: string): StockPriceHistory {
  const openPrice = asNumber(row.open_price);
  const closePrice = asNumber(row.close_price);
  const change = closePrice - openPrice;

  return {
    priceId: `price_${row.id}`,
    stockId: symbol,
    symbol,
    gameDay: row.game_day,
    openPrice,
    highPrice: asNumber(row.high_price),
    lowPrice: asNumber(row.low_price),
    closePrice,
    volume: asNumber(row.volume),
    change,
    changePercent: openPrice > 0 ? (change / openPrice) * 100 : 0,
    eventImpact: asNumber(row.event_impact),
  };
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [session, setSession] = useState<GameSession | null>(null);
  const [account, setAccount] = useState<TradingAccount>(defaultAccount);
  const [gameDay, setGameDayState] = useState(() => {
    const saved = Number(localStorage.getItem(GAME_DAY_STORAGE_KEY));
    return normalizeGameDay(saved || 1);
  });
  const [databaseStocks, setDatabaseStocks] = useState<DatabaseStock[]>([]);
  const [databaseEvents, setDatabaseEvents] = useState<DatabaseEvent[]>([]);
  const [databasePrices, setDatabasePrices] = useState<DatabasePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMarketData = useCallback(async () => {
    const [stocksResult, eventsResult, pricesResult] = await Promise.all([
      supabase.from("stocks").select("*").eq("is_active", true).order("symbol"),
      supabase
        .from("market_events")
        .select(`
          id, event_key, game_day, source, headline, body, importance,
          category, is_accurate, is_rumor,
          event_stock_impacts (
            expected_impact,
            actual_impact,
            stocks (symbol)
          )
        `)
        .order("game_day"),
      supabase
        .from("stock_prices")
        .select(`
          id, game_day, open_price, high_price, low_price, close_price,
          volume, event_impact,
          stocks (symbol)
        `)
        .gt("game_day", 0)
        .order("game_day"),
    ]);

    if (stocksResult.error) throw stocksResult.error;
    if (eventsResult.error) throw eventsResult.error;
    if (pricesResult.error) throw pricesResult.error;

    setDatabaseStocks((stocksResult.data ?? []) as DatabaseStock[]);
    setDatabaseEvents((eventsResult.data ?? []) as unknown as DatabaseEvent[]);
    setDatabasePrices((pricesResult.data ?? []) as unknown as DatabasePrice[]);
  }, []);

  const loadHoldings = useCallback(async (sessionId: string) => {
    const { data, error: holdingsError } = await supabase
      .from("holdings")
      .select(`
        quantity,
        average_purchase_price,
        stocks (symbol, company_name)
      `)
      .eq("session_id", sessionId);

    if (holdingsError) throw holdingsError;

    return (data ?? []).map((row: any): PortfolioHolding => {
      const stock = Array.isArray(row.stocks) ? row.stocks[0] : row.stocks;
      return {
        symbol: stock.symbol,
        name: stock.company_name,
        shares: row.quantity,
        averageCost: asNumber(row.average_purchase_price),
      };
    });
  }, []);

  const loadOrCreateSession = useCallback(async () => {
    if (!user) {
      setSession(null);
      setAccount(defaultAccount);
      return;
    }

    const { data: existing, error: sessionError } = await supabase
      .from("game_sessions")
      .select("id, current_day, cash_balance")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) throw sessionError;

    let activeSession = existing as GameSession | null;

    if (!activeSession) {
      const { data, error: createError } = await supabase.rpc("start_new_game");
      if (createError) throw createError;
      activeSession = data as GameSession;
    }

    const holdings = await loadHoldings(activeSession.id);
    const currentDay = normalizeGameDay(activeSession.current_day);

    setSession(activeSession);
    setGameDayState(currentDay);
    setAccount({
      cash: asNumber(activeSession.cash_balance),
      holdings,
    });
  }, [loadHoldings, user]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([loadMarketData(), loadOrCreateSession()]);
      } catch (loadError: any) {
        if (!cancelled) {
          setError(loadError?.message ?? "Could not load game data from Supabase.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadMarketData, loadOrCreateSession]);

  useEffect(() => {
    localStorage.setItem(GAME_DAY_STORAGE_KEY, gameDay.toString());
  }, [gameDay]);

  const stocks = useMemo(() => {
    return databaseStocks
      .filter((stock) => stock.is_active)
      .map((stock) => {
        const today = databasePrices.find(
          (price) =>
            relatedSymbol(price.stocks) === stock.symbol
            && price.game_day === gameDay
        );
        const yesterday = databasePrices.find(
          (price) =>
            relatedSymbol(price.stocks) === stock.symbol
            && price.game_day === gameDay - 1
        );

        return mapDatabaseStock(stock, today, yesterday);
      });
  }, [databasePrices, databaseStocks, gameDay]);

  const news = useMemo(() => {
    return databaseEvents
      .filter((event) => event.game_day === gameDay)
      .map(mapDatabaseEvent);
  }, [databaseEvents, gameDay]);

  const getHistory = useCallback((symbol: string) => {
    return databasePrices
      .filter((price) => relatedSymbol(price.stocks) === symbol)
      .filter((price) => price.game_day <= gameDay)
      .map((price) => mapDatabasePrice(price, symbol))
      .sort((a, b) => a.gameDay - b.gameDay);
  }, [databasePrices, gameDay]);

  const getStock = useCallback(
    (symbol: string) => stocks.find(
      (stock) => stock.symbol.toLowerCase() === symbol.toLowerCase()
    ),
    [stocks]
  );

  const getRelatedNews = useCallback((symbol: string) => {
    return databaseEvents
      .filter((event) => event.game_day <= gameDay)
      .map(mapDatabaseEvent)
      .filter((event) => event.relatedTickers.includes(symbol))
      .sort((a, b) => b.gameDay - a.gameDay);
  }, [databaseEvents, gameDay]);

  const setGameDay = useCallback((
    day: number | ((current: number) => number)
  ) => {
    setGameDayState((current) => {
      const requested = typeof day === "function" ? day(current) : day;
      const next = Math.min(30, normalizeGameDay(requested));

      if (session) {
        void supabase
          .from("game_sessions")
          .update({ current_day: next })
          .eq("id", session.id);
      }

      return next;
    });
  }, [session]);

  const executeTrade = useCallback(async (
    stock: Stock,
    tradeType: "buy" | "sell"
  ) => {
    if (!session || !user) return false;
    if (tradeType === "buy" && account.cash < stock.currentPrice) return false;
    if (
      tradeType === "sell"
      && !account.holdings.some(
        (holding) => holding.symbol === stock.symbol && holding.shares > 0
      )
    ) return false;

    const { data, error: tradeError } = await supabase.rpc("execute_trade", {
      target_session_id: session.id,
      target_symbol: stock.symbol,
      target_trade_type: tradeType,
      target_price: stock.currentPrice,
      target_game_day: gameDay,
      target_quantity: 1,
    });

    if (tradeError) {
      setError(tradeError.message);
      return false;
    }

    const result = data as TradeResult;

    setAccount((current) => {
      const existing = current.holdings.find(
        (holding) => holding.symbol === result.symbol
      );
      const quantity = Number(result.quantity);
      let holdings = current.holdings;

      if (quantity === 0) {
        holdings = holdings.filter(
          (holding) => holding.symbol !== result.symbol
        );
      } else if (existing) {
        holdings = holdings.map((holding) =>
          holding.symbol === result.symbol
            ? {
                ...holding,
                shares: quantity,
                averageCost: asNumber(result.average_purchase_price),
              }
            : holding
        );
      } else {
        holdings = [
          ...holdings,
          {
            symbol: stock.symbol,
            name: stock.name,
            shares: quantity,
            averageCost: asNumber(result.average_purchase_price),
          },
        ];
      }

      return {
        cash: asNumber(result.cash),
        holdings,
      };
    });

    setError(null);
    return true;
  }, [account.cash, account.holdings, gameDay, session, user]);

  const buyStock = useCallback(
    (stock: Stock) => executeTrade(stock, "buy"),
    [executeTrade]
  );

  const sellStock = useCallback(
    (stock: Stock) => executeTrade(stock, "sell"),
    [executeTrade]
  );

  const resetAccount = useCallback(async () => {
    if (!user) {
      setAccount(defaultAccount);
      setGameDayState(1);
      return;
    }

    const { data, error: resetError } = await supabase.rpc("start_new_game");
    if (resetError) {
      setError(resetError.message);
      return;
    }

    const nextSession = data as GameSession;
    setSession(nextSession);
    setAccount(defaultAccount);
    setGameDayState(1);
    setError(null);
  }, [user]);

  const setCash = useCallback(async (cash: number) => {
    const nextCash = Math.max(0, Number(cash.toFixed(2)));
    setAccount((current) => ({ ...current, cash: nextCash }));
    if (session) {
      await supabase
        .from("game_sessions")
        .update({ cash_balance: nextCash })
        .eq("id", session.id);
    }
  }, [session]);

  const addCash = useCallback(
    async (amount: number) => setCash(account.cash + amount),
    [account.cash, setCash]
  );

  const setHolding = useCallback(async (stock: Stock, shares: number) => {
    if (!session) return;

    const nextShares = Math.max(0, Math.floor(shares));
    const databaseStock = databaseStocks.find(
      (item) => item.symbol === stock.symbol
    );

    if (!databaseStock) return;

    if (nextShares === 0) {
      await supabase
        .from("holdings")
        .delete()
        .eq("session_id", session.id)
        .eq("stock_id", databaseStock.id);
    } else {
      await supabase.from("holdings").upsert({
        session_id: session.id,
        stock_id: databaseStock.id,
        quantity: nextShares,
        average_purchase_price: stock.currentPrice,
      }, { onConflict: "session_id,stock_id" });
    }

    setAccount((current) => {
      const withoutStock = current.holdings.filter(
        (holding) => holding.symbol !== stock.symbol
      );

      return {
        ...current,
        holdings: nextShares === 0
          ? withoutStock
          : [
              ...withoutStock,
              {
                symbol: stock.symbol,
                name: stock.name,
                shares: nextShares,
                averageCost: stock.currentPrice,
              },
            ],
      };
    });
  }, [databaseStocks, session]);

  useEffect(() => {
    if (!session || loading) return;

    const portfolioValue = getPortfolioValue(account, stocks);
    void supabase
      .from("game_sessions")
      .update({
        portfolio_value: Number(portfolioValue.toFixed(2)),
        net_worth: Number((account.cash + portfolioValue).toFixed(2)),
      })
      .eq("id", session.id);
  }, [account, loading, session, stocks]);

  const value = useMemo<GameContextValue>(() => ({
    account,
    buyStock,
    sellStock,
    resetAccount,
    setCash,
    addCash,
    setHolding,
    gameDay,
    setGameDay,
    stocks,
    news,
    getStock,
    getHistory,
    getRelatedNews,
    loading,
    error,
  }), [
    account, addCash, buyStock, error, gameDay, getHistory, getRelatedNews,
    getStock, loading, news, resetAccount, sellStock, setCash, setGameDay,
    setHolding, stocks,
  ]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within GameProvider");
  }
  return context;
}
