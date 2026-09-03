import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";

import {
  generateMarketSeedCode,
  getNewsForGameDay,
  getNewsUpToGameDay,
  getRelatedNewsBySymbol,
  getSelectedStoryArcKeys,
  getStockHistoryBySymbol,
  getStocksForGameDay,
  hashString,
  MarketNews,
  normalizeGameDay,
  normalizeMarketSeed,
  seededRange,
  Stock,
  StockPriceHistory,
} from "../data/mockStocks";
import {
  getPortfolioValue,
  getSlippageAdjustedPrice,
  PortfolioHolding,
  TradingAccount,
} from "../data/tradingState";
import { supabase } from "../lib/supabase";
import { syncGameState } from "../lib/api";
import { recordTradeJournalEntry, TradeJournalInput } from "../lib/tradeJournal";
import { useAuth } from "./AuthContext";

const STARTING_CASH = 2_000;
const GAME_DAY_STORAGE_KEY = "stockpilot-current-game-day";
const GAME_SEED_STORAGE_KEY = "stockpilot-market-seed";
export const LIMITED_GAME_DAYS = 30;
// Ceiling for infinite mode. Each day past the last stored price point is
// generated in a loop per stock, so an out-of-range day (corrupted or
// hand-edited localStorage) would otherwise lock up the tab.
export const MAX_GAME_DAY = 10_000;
export const WEEKLY_BILL_ITEMS = [
  { label: "Rent", amount: 200, detail: "Housing for one weekly cycle" },
  { label: "Food", amount: 100, detail: "Groceries and everyday meals" },
  { label: "Utilities", amount: 50, detail: "Power, water, and connectivity" },
] as const;
export const WEEKLY_BILL_TOTAL = WEEKLY_BILL_ITEMS.reduce((sum, item) => sum + item.amount, 0);
export type GameMode = "infinite" | "limited_30";

export type BillCharge = {
  cycles: number;
  total: number;
  paid: number;
  shortfall: number;
  day: number;
};

function gameDayStorageKey(sessionId: string) {
  return `${GAME_DAY_STORAGE_KEY}:${sessionId}`;
}

function marketSeedStorageKey(sessionId: string) {
  return `${GAME_SEED_STORAGE_KEY}:${sessionId}`;
}

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
  game_mode?: GameMode | null;
  game_seed?: string | null;
};

type TradeResult = {
  cash: number | string;
  symbol: string;
  quantity: number;
  average_purchase_price: number | string;
};

type GameContextValue = {
  account: TradingAccount;
  buyStock: (stock: Stock, quantity?: number, journal?: TradeJournalInput) => Promise<boolean>;
  sellStock: (stock: Stock, quantity?: number, journal?: TradeJournalInput) => Promise<boolean>;
  getTradeQuote: (stock: Stock, tradeType: "buy" | "sell", quantity?: number) => {
    basePrice: number; effectivePrice: number; slippage: number; total: number;
  };
  resetAccount: (mode?: GameMode) => Promise<void>;
  setCash: (cash: number) => Promise<void>;
  addCash: (amount: number) => Promise<void>;
  setHolding: (stock: Stock, shares: number) => Promise<void>;
  addToWatchlist: (stock: Stock) => Promise<void>;
  removeFromWatchlist: (stock: Stock) => Promise<void>;
  toggleWatchlist: (stock: Stock) => Promise<void>;
  isWatchlisted: (symbol: string) => boolean;
  watchlistSymbols: string[];
  watchlistStocks: Stock[];
  gameDay: number;
  setGameDay: (day: number | ((current: number) => number)) => Promise<void>;
  latestBill: BillCharge | null;
  clearLatestBill: () => void;
  gameMode: GameMode;
  marketSeed: string;
  storyArcs: string[];
  maxGameDay: number | null;
  isGameComplete: boolean;
  stocks: Stock[];
  news: MarketNews[];
  newsHistory: MarketNews[];
  getStock: (symbol: string) => Stock | undefined;
  getHistory: (symbol: string) => StockPriceHistory[];
  getRelatedNews: (symbol: string) => MarketNews[];
  loading: boolean;
  error: string | null;
  sessionId: string | null;
  reloadSession: () => Promise<void>;
  syncSessionValue: () => Promise<void>;
};

const defaultAccount: TradingAccount = {
  cash: STARTING_CASH,
  holdings: [],
};

const GameContext = createContext<GameContextValue | undefined>(undefined);

function asNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function normalizeGameMode(value: string | null | undefined): GameMode {
  return value === "limited_30" ? "limited_30" : "infinite";
}

function isMissingSeedColumn(error: { message?: string } | null | undefined) {
  return Boolean(error?.message?.toLowerCase().includes("game_seed"));
}

function clampGameDayForMode(day: number, mode: GameMode) {
  const normalized = normalizeGameDay(day);
  return mode === "limited_30"
    ? Math.min(LIMITED_GAME_DAYS, normalized)
    : Math.min(MAX_GAME_DAY, normalized);
}

function relatedSymbol(
  relation: { symbol: string } | { symbol: string }[] | null
) {
  if (Array.isArray(relation)) return relation[0]?.symbol;
  return relation?.symbol;
}

// market_events has no tone column, so tone is derived the same way the seeded
// market data pairs them: the sign of the *expected* impact. Deriving from the
// actual impact instead would leak how rumors and inaccurate reports resolve.
function toneFromImpact(expectedImpact: number): MarketNews["marketTone"] {
  if (expectedImpact > 0) return "Bullish";
  if (expectedImpact < 0) return "Bearish";
  return "Unclear";
}

function mapDatabaseEvent(row: DatabaseEvent): MarketNews {
  const impacts = row.event_stock_impacts ?? [];
  const expectedImpact = impacts[0] ? asNumber(impacts[0].expected_impact) : 0;

  return {
    newsId: row.event_key,
    gameDay: row.game_day,
    source: row.source,
    headline: row.headline,
    body: row.body,
    importance: row.importance,
    marketTone: toneFromImpact(expectedImpact),
    relatedTickers: impacts
      .map((impact) => relatedSymbol(impact.stocks))
      .filter((symbol): symbol is string => Boolean(symbol)),
    expectedImpact,
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function getContinuationMeanReversion(stock: DatabaseStock, previousClose: number) {
  const startingPrice = asNumber(stock.initial_price);
  if (startingPrice <= 0 || previousClose <= 0) return 0;

  const priceMultiple = previousClose / startingPrice;
  return clamp(-Math.log(priceMultiple) * 0.012, -0.035, 0.025);
}

function getContinuationTrendBias(stock: DatabaseStock, gameDay: number) {
  const fadeStartDay = 45;
  const fadeEndDay = 180;
  const fadeProgress = clamp(
    (gameDay - fadeStartDay) / (fadeEndDay - fadeStartDay),
    0,
    1
  );

  return asNumber(stock.trend_bias) * (1 - fadeProgress * 0.85);
}

function generateContinuationPricePoint(
  stock: DatabaseStock,
  previousClose: number,
  gameDay: number,
  marketSeed: string
): StockPriceHistory {
  const symbol = stock.symbol;
  const marketDrift =
    0.0007 +
    Math.sin(gameDay / 14) * 0.003 +
    seededRange(`market-continuation-${gameDay}`, -0.006, 0.006, marketSeed);
  const sectorDrift =
    Math.sin((gameDay + hashString(stock.sector) % 11) / 8) * 0.004 +
    seededRange(`sector-continuation-${stock.sector}-${gameDay}`, -0.004, 0.004, marketSeed);
  const randomShock =
    seededRange(`shock-continuation-${symbol}-${gameDay}`, -1, 1, marketSeed) *
    asNumber(stock.volatility);
  const trendBias = getContinuationTrendBias(stock, gameDay);
  const meanReversion = getContinuationMeanReversion(stock, previousClose);
  const dailyReturn = clamp(
    marketDrift + sectorDrift + trendBias + meanReversion + randomShock,
    -0.15,
    0.15
  );

  const openPrice = previousClose;
  const closePrice = Math.max(1, openPrice * (1 + dailyReturn));
  const intradayRange =
    Math.abs(dailyReturn) * 0.45 +
    asNumber(stock.volatility) *
      seededRange(`range-continuation-${symbol}-${gameDay}`, 0.18, 0.5, marketSeed);
  const highPrice = Math.max(openPrice, closePrice) * (1 + intradayRange);
  const lowPrice = Math.min(openPrice, closePrice) * (1 - intradayRange * 0.8);
  const baseVolume =
    stock.risk_level === "High"
      ? 1_200_000
      : stock.risk_level === "Medium"
        ? 850_000
        : 600_000;
  const activityBoost = Math.abs(dailyReturn) * 12;
  const randomBoost = seededRange(`volume-continuation-${symbol}-${gameDay}`, -0.12, 0.22, marketSeed);

  return {
    priceId: `generated_${symbol.toLowerCase()}_${gameDay}`,
    stockId: symbol,
    symbol,
    gameDay,
    openPrice: round2(openPrice),
    highPrice: round2(highPrice),
    lowPrice: round2(Math.max(1, lowPrice)),
    closePrice: round2(closePrice),
    volume: Math.round(baseVolume * (1 + activityBoost + randomBoost)),
    change: round2(closePrice - openPrice),
    changePercent: openPrice > 0 ? round2(((closePrice - openPrice) / openPrice) * 100) : 0,
    eventImpact: 0,
  };
}

function getHistoryForDatabaseStock(
  stock: DatabaseStock,
  prices: DatabasePrice[],
  throughDay: number,
  marketSeed: string
) {
  const storedHistory = prices
    .filter((price) => relatedSymbol(price.stocks) === stock.symbol)
    .map((price) => mapDatabasePrice(price, stock.symbol))
    .sort((a, b) => a.gameDay - b.gameDay);

  const safeGameDay = normalizeGameDay(throughDay);
  const visibleHistory = storedHistory.filter((price) => price.gameDay <= safeGameDay);
  const lastStoredPoint = storedHistory[storedHistory.length - 1];

  if (!lastStoredPoint || safeGameDay <= lastStoredPoint.gameDay) {
    return visibleHistory;
  }

  const generatedHistory = [...visibleHistory];
  let previousClose = lastStoredPoint.closePrice;

  for (let day = lastStoredPoint.gameDay + 1; day <= safeGameDay; day += 1) {
    const point = generateContinuationPricePoint(stock, previousClose, day, marketSeed);
    generatedHistory.push(point);
    previousClose = point.closePrice;
  }

  return generatedHistory;
}

function mapStockFromHistory(row: DatabaseStock, history: StockPriceHistory[]): Stock {
  const startingPrice = asNumber(row.initial_price);
  const today = history[history.length - 1];
  const yesterday = history[history.length - 2];
  const currentPrice = today?.closePrice ?? asNumber(row.current_price);
  const previousPrice = yesterday?.closePrice ?? startingPrice;
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
    currentPrice: round2(currentPrice),
    previousPrice: round2(previousPrice),
    dayChange: round2(dayChange),
    dayChangePercent: previousPrice > 0 ? round2((dayChange / previousPrice) * 100) : 0,
    volume: today?.volume ?? 0,
    eventImpact: today?.eventImpact ?? 0,
  };
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [session, setSession] = useState<GameSession | null>(null);
  const [account, setAccount] = useState<TradingAccount>(defaultAccount);
  const [gameMode, setGameModeState] = useState<GameMode>("infinite");
  // Seeded from neutral defaults, never from the unscoped GAME_*_STORAGE_KEY
  // entries: those are shared by every account on this browser, so reading them
  // here handed the next player the previous player's day and market seed for
  // the first render -- before loadOrCreateSession() replaced them. Hooks that
  // key off gameDay (alerts, streaks, the rival) ran against that stale day.
  // loadOrCreateSession() is the only source of real progress; until it lands,
  // day 1 on the default seed is the correct neutral state.
  const [marketSeed, setMarketSeed] = useState(() => normalizeMarketSeed(null));
  const [gameDay, setGameDayState] = useState(1);
  const [databaseStocks, setDatabaseStocks] = useState<DatabaseStock[]>([]);
  const [databaseEvents, setDatabaseEvents] = useState<DatabaseEvent[]>([]);
  const [databasePrices, setDatabasePrices] = useState<DatabasePrice[]>([]);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestBill, setLatestBill] = useState<BillCharge | null>(null);
  const gameDayRef = useRef(gameDay);

  useEffect(() => {
    gameDayRef.current = gameDay;
  }, [gameDay]);

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

  const loadWatchlist = useCallback(async () => {
    if (!user) {
      setWatchlistSymbols([]);
      return;
    }

    const { data, error: watchlistError } = await supabase
      .from("user_watchlist")
      .select("stocks (symbol)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (watchlistError) throw watchlistError;

    const symbols = (data ?? [])
      .map((row: any) => {
        const stock = Array.isArray(row.stocks) ? row.stocks[0] : row.stocks;
        return stock?.symbol;
      })
      .filter((symbol): symbol is string => Boolean(symbol));

    setWatchlistSymbols(symbols);
  }, [user]);

  const loadOrCreateSession = useCallback(async () => {
    if (!user) {
      setSession(null);
      setAccount(defaultAccount);
      setWatchlistSymbols([]);
      return;
    }

    let sessionResult = await supabase
      .from("game_sessions")
      .select("id, current_day, cash_balance, game_mode, game_seed")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (isMissingSeedColumn(sessionResult.error)) {
      sessionResult = await supabase
        .from("game_sessions")
        .select("id, current_day, cash_balance, game_mode")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    }

    const { data: existing, error: sessionError } = sessionResult;

    if (sessionError) throw sessionError;

    let activeSession = existing as GameSession | null;

    if (!activeSession) {
      const { data, error: createError } = await supabase.rpc("start_new_game_with_mode", {
        target_game_mode: "infinite",
      });
      if (createError) throw createError;
      activeSession = data as GameSession;
    }

    const holdings = await loadHoldings(activeSession.id);
    const activeMode = normalizeGameMode(activeSession.game_mode);
    // Only session-scoped keys are consulted. The unscoped GAME_*_STORAGE_KEY
    // entries are shared by every account on this browser, so falling back to
    // them handed a new player the previous player's day and market seed --
    // and in limited_30 a day past 30 clamps to 30, ending a fresh game on
    // arrival. They are still written below for backwards compatibility, but
    // never read back as a source of progress.
    const storedSessionSeed = localStorage.getItem(marketSeedStorageKey(activeSession.id));
    const activeSeed = normalizeMarketSeed(
      activeMode === "limited_30"
        ? activeSession.game_seed ?? storedSessionSeed ?? generateMarketSeedCode()
        : activeSession.game_seed ?? storedSessionSeed
    );
    const storedSessionDay = Number(localStorage.getItem(gameDayStorageKey(activeSession.id)));
    const savedDay = clampGameDayForMode(storedSessionDay || 1, activeMode);
    const rawDatabaseDay = normalizeGameDay(activeSession.current_day);
    const databaseDay = clampGameDayForMode(rawDatabaseDay, activeMode);
    const currentDay = databaseDay === 1 && savedDay > 1 ? savedDay : databaseDay;

    if (
      currentDay !== rawDatabaseDay
      || activeMode !== activeSession.game_mode
      || (activeMode === "limited_30" && activeSession.game_seed !== activeSeed)
    ) {
      const { error: dayError } = await supabase
        .from("game_sessions")
        .update({ current_day: currentDay, game_mode: activeMode, game_seed: activeSeed })
        .eq("id", activeSession.id);

      if (isMissingSeedColumn(dayError)) {
        const { error: retryError } = await supabase
          .from("game_sessions")
          .update({ current_day: currentDay, game_mode: activeMode })
          .eq("id", activeSession.id);

        if (retryError) throw retryError;
      } else if (dayError) {
        throw dayError;
      }

      activeSession = {
        ...activeSession,
        current_day: currentDay,
        game_mode: activeMode,
        game_seed: activeSeed,
      };
    }

    localStorage.setItem(gameDayStorageKey(activeSession.id), currentDay.toString());
    localStorage.setItem(GAME_DAY_STORAGE_KEY, currentDay.toString());
    localStorage.setItem(marketSeedStorageKey(activeSession.id), activeSeed);
    localStorage.setItem(GAME_SEED_STORAGE_KEY, activeSeed);
    gameDayRef.current = currentDay;

    setSession(activeSession);
    setGameModeState(activeMode);
    setMarketSeed(activeSeed);
    setGameDayState(currentDay);
    setAccount({
      cash: asNumber(activeSession.cash_balance),
      holdings,
    });
    await loadWatchlist();
  }, [loadHoldings, loadWatchlist, user]);

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
    if (gameMode === "limited_30") {
      return getStocksForGameDay(gameDay, marketSeed);
    }

    return databaseStocks
      .filter((stock) => stock.is_active)
      .map((stock) => {
        const history = getHistoryForDatabaseStock(stock, databasePrices, gameDay, marketSeed);
        return mapStockFromHistory(stock, history);
      });
  }, [databasePrices, databaseStocks, gameDay, gameMode, marketSeed]);

  const news = useMemo(() => {
    if (gameMode === "limited_30") {
      return getNewsForGameDay(gameDay, marketSeed);
    }

    return databaseEvents
      .filter((event) => event.game_day === gameDay)
      .map(mapDatabaseEvent);
  }, [databaseEvents, gameDay, gameMode, marketSeed]);

  // Every story the player could have seen so far, newest first. The inbox
  // renders news as mail alongside the in-game messages, and a mailbox holding
  // only today's headlines would read as broken.
  const newsHistory = useMemo(() => {
    const all = gameMode === "limited_30"
      ? getNewsUpToGameDay(gameDay, marketSeed)
      : databaseEvents
          .filter((event) => event.game_day <= gameDay)
          .map(mapDatabaseEvent);
    return [...all].sort((a, b) => b.gameDay - a.gameDay);
  }, [databaseEvents, gameDay, gameMode, marketSeed]);

  const getHistory = useCallback((symbol: string) => {
    if (gameMode === "limited_30") {
      return getStockHistoryBySymbol(symbol, gameDay, marketSeed);
    }

    const stock = databaseStocks.find(
      (item) => item.symbol.toLowerCase() === symbol.toLowerCase()
    );

    return stock ? getHistoryForDatabaseStock(stock, databasePrices, gameDay, marketSeed) : [];
  }, [databasePrices, databaseStocks, gameDay, gameMode, marketSeed]);

  const getStock = useCallback(
    (symbol: string) => stocks.find(
      (stock) => stock.symbol.toLowerCase() === symbol.toLowerCase()
    ),
    [stocks]
  );

  const getRelatedNews = useCallback((symbol: string) => {
    if (gameMode === "limited_30") {
      return getRelatedNewsBySymbol(symbol, gameDay, marketSeed);
    }

    // Ascending, matching getRelatedNewsBySymbol's day 1..gameDay loop above.
    // StockDetails renders relatedNews.slice(-8) -- the TAIL -- so a descending
    // sort here silently showed the eight OLDEST stories in infinite mode while
    // limited_30 showed the eight newest. Sorted explicitly rather than relying
    // on the .order("game_day") in the fetch 250 lines away.
    return databaseEvents
      .filter((event) => event.game_day <= gameDay)
      .map(mapDatabaseEvent)
      .filter((event) => event.relatedTickers.includes(symbol))
      .sort((a, b) => a.gameDay - b.gameDay);
  }, [databaseEvents, gameDay, gameMode, marketSeed]);

  const setGameDay = useCallback(async (
    day: number | ((current: number) => number)
  ) => {
    const requested = typeof day === "function" ? day(gameDayRef.current) : day;
    const next = clampGameDayForMode(requested, gameMode);

    if (!session) {
      gameDayRef.current = next;
      setGameDayState(next);
      localStorage.setItem(GAME_DAY_STORAGE_KEY, next.toString());
      return;
    }

    const { data, error: dayError } = await supabase.rpc("advance_game_day", {
      target_session_id: session.id,
      target_game_day: next,
      target_game_mode: gameMode,
    });

    if (dayError) {
      setError(dayError.message);
    } else {
      const result = data as {
        day: number;
        cash: number | string;
        cycles_charged: number;
        bill_total: number | string;
        amount_paid: number | string;
        shortfall: number | string;
      };
      const appliedDay = Number(result.day);
      gameDayRef.current = appliedDay;
      setGameDayState(appliedDay);
      setAccount((current) => ({ ...current, cash: asNumber(result.cash) }));
      localStorage.setItem(GAME_DAY_STORAGE_KEY, appliedDay.toString());
      localStorage.setItem(gameDayStorageKey(session.id), appliedDay.toString());
      if (result.cycles_charged > 0) {
        setLatestBill({
          cycles: result.cycles_charged,
          total: asNumber(result.bill_total),
          paid: asNumber(result.amount_paid),
          shortfall: asNumber(result.shortfall),
          day: appliedDay,
        });
      }
      setError(null);
    }
  }, [gameMode, session]);

  const getTradeQuote = useCallback((
    stock: Stock,
    tradeType: "buy" | "sell",
    quantity = 1
  ) => {
    const netWorth = account.cash + getPortfolioValue(account, stocks);
    const tradeValue = stock.currentPrice * quantity;
    const effectivePrice = getSlippageAdjustedPrice(stock.currentPrice, tradeType, tradeValue, netWorth);
    const slippage = stock.currentPrice > 0 ? (effectivePrice - stock.currentPrice) / stock.currentPrice : 0;
    return {
      basePrice: stock.currentPrice,
      effectivePrice,
      slippage: Math.abs(slippage),
      total: effectivePrice * quantity,
    };
  }, [account, stocks]);

  const executeTrade = useCallback(async (
    stock: Stock,
    tradeType: "buy" | "sell",
    quantity = 1,
    journal?: TradeJournalInput,
  ) => {
    if (!session || !user) return false;

    const quote = getTradeQuote(stock, tradeType, quantity);

    if (tradeType === "buy" && account.cash < quote.total) return false;
    if (tradeType === "sell") {
      const holding = account.holdings.find((h) => h.symbol === stock.symbol);
      if (!holding || holding.shares < quantity) return false;
    }

    const { data, error: tradeError } = await supabase.rpc("execute_trade", {
      target_session_id: session.id,
      target_symbol: stock.symbol,
      target_trade_type: tradeType,
      target_price: quote.effectivePrice,
      target_game_day: gameDay,
      target_quantity: quantity,
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

    if (journal && (journal.thesis.trim() || journal.exitPlan.trim())) {
      const journalSaved = await recordTradeJournalEntry({
        sessionId: session.id,
        userId: user.id,
        symbol: stock.symbol,
        tradeType,
        quantity,
        executionPrice: quote.effectivePrice,
        gameDay,
        journal,
      });
      if (!journalSaved) {
        setError("The trade completed, but its decision journal could not be saved.");
        return true;
      }
    }

    setError(null);
    return true;
  }, [account.cash, account.holdings, gameDay, getTradeQuote, session, user]);

  const buyStock = useCallback(
    (stock: Stock, quantity = 1, journal?: TradeJournalInput) => executeTrade(stock, "buy", quantity, journal),
    [executeTrade]
  );

  const sellStock = useCallback(
    (stock: Stock, quantity = 1, journal?: TradeJournalInput) => executeTrade(stock, "sell", quantity, journal),
    [executeTrade]
  );

  const resetAccount = useCallback(async (mode: GameMode = gameMode) => {
    const nextMode = normalizeGameMode(mode);
    const nextSeed = normalizeMarketSeed(
      nextMode === "limited_30" ? generateMarketSeedCode() : marketSeed
    );

    if (!user) {
      setAccount(defaultAccount);
      setGameModeState(nextMode);
      setMarketSeed(nextSeed);
      localStorage.setItem(GAME_SEED_STORAGE_KEY, nextSeed);
      setGameDayState(1);
      return;
    }

    const { data, error: resetError } = await supabase.rpc("start_new_game_with_mode", {
      target_game_mode: nextMode,
    });
    if (resetError) {
      setError(resetError.message);
      return;
    }

    const nextSession = data as GameSession;
    const { error: seedError } = await supabase
      .from("game_sessions")
      .update({ game_seed: nextSeed })
      .eq("id", nextSession.id);

    if (seedError && !isMissingSeedColumn(seedError)) {
      setError(seedError.message);
      return;
    }

    localStorage.setItem(gameDayStorageKey(nextSession.id), "1");
    localStorage.setItem(GAME_DAY_STORAGE_KEY, "1");
    localStorage.setItem(marketSeedStorageKey(nextSession.id), nextSeed);
    localStorage.setItem(GAME_SEED_STORAGE_KEY, nextSeed);
    gameDayRef.current = 1;
    setSession({ ...nextSession, game_seed: nextSeed });
    setGameModeState(nextMode);
    setMarketSeed(nextSeed);
    setAccount(defaultAccount);
    setGameDayState(1);
    setLatestBill(null);
    setError(null);
  }, [gameMode, marketSeed, user]);

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

  const isWatchlisted = useCallback((symbol: string) => (
    watchlistSymbols.some((item) => item.toLowerCase() === symbol.toLowerCase())
  ), [watchlistSymbols]);

  const addToWatchlist = useCallback(async (stock: Stock) => {
    if (!user) return;
    const databaseStock = databaseStocks.find((item) => item.symbol === stock.symbol);
    if (!databaseStock) return;

    setWatchlistSymbols((current) => (
      current.includes(stock.symbol) ? current : [stock.symbol, ...current]
    ));

    const { error: watchlistError } = await supabase.from("user_watchlist").upsert({
      user_id: user.id,
      stock_id: databaseStock.id,
    }, { onConflict: "user_id,stock_id" });

    if (watchlistError) {
      setError(watchlistError.message);
      setWatchlistSymbols((current) => current.filter((symbol) => symbol !== stock.symbol));
    }
  }, [databaseStocks, user]);

  const removeFromWatchlist = useCallback(async (stock: Stock) => {
    if (!user) return;
    const databaseStock = databaseStocks.find((item) => item.symbol === stock.symbol);
    if (!databaseStock) return;

    setWatchlistSymbols((current) => current.filter((symbol) => symbol !== stock.symbol));

    const { error: watchlistError } = await supabase
      .from("user_watchlist")
      .delete()
      .eq("user_id", user.id)
      .eq("stock_id", databaseStock.id);

    if (watchlistError) {
      setError(watchlistError.message);
      setWatchlistSymbols((current) => (
        current.includes(stock.symbol) ? current : [stock.symbol, ...current]
      ));
    }
  }, [databaseStocks, user]);

  const toggleWatchlist = useCallback(async (stock: Stock) => {
    if (isWatchlisted(stock.symbol)) {
      await removeFromWatchlist(stock);
    } else {
      await addToWatchlist(stock);
    }
  }, [addToWatchlist, isWatchlisted, removeFromWatchlist]);

  const syncSessionValue = useCallback(async () => {
    if (!session || loading) return;
    const portfolioValue = getPortfolioValue(account, stocks);
    const netWorth = account.cash + portfolioValue;

    try {
      await syncGameState({
        sessionId: session.id,
        portfolioValue,
        netWorth,
        gameMode,
        day: gameDay,
      });
      setError(null);
    } catch (syncError: any) {
      setError(syncError?.message ?? "Could not sync session value.");
    }
  }, [account, gameDay, gameMode, loading, session, stocks]);

  useEffect(() => {
    void syncSessionValue();
  }, [syncSessionValue]);

  const maxGameDay = gameMode === "limited_30" ? LIMITED_GAME_DAYS : null;
  const isGameComplete = maxGameDay !== null && gameDay >= maxGameDay;
  const storyArcs = useMemo(() => (
    gameMode === "limited_30" ? getSelectedStoryArcKeys(marketSeed) : []
  ), [gameMode, marketSeed]);
  const watchlistStocks = useMemo(() => (
    watchlistSymbols
      .map((symbol) => stocks.find((stock) => stock.symbol === symbol))
      .filter((stock): stock is Stock => Boolean(stock))
  ), [stocks, watchlistSymbols]);

  useEffect(() => {
    const command = () => ({
      mode: gameMode,
      seed: marketSeed,
      storyArcs,
      day: gameDay,
      sessionId: session?.id ?? null,
    });

    (window as typeof window & {
      stockpilotSeed?: typeof command;
      stockPilotSeed?: typeof command;
    }).stockpilotSeed = command;
    (window as typeof window & {
      stockpilotSeed?: typeof command;
      stockPilotSeed?: typeof command;
    }).stockPilotSeed = command;

    return () => {
      delete (window as typeof window & { stockpilotSeed?: typeof command }).stockpilotSeed;
      delete (window as typeof window & { stockPilotSeed?: typeof command }).stockPilotSeed;
    };
  }, [gameDay, gameMode, marketSeed, session, storyArcs]);

  const value = useMemo<GameContextValue>(() => ({
    account,
    buyStock,
    sellStock,
    getTradeQuote,
    resetAccount,
    setCash,
    addCash,
    setHolding,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isWatchlisted,
    watchlistSymbols,
    watchlistStocks,
    gameDay,
    setGameDay,
    latestBill,
    clearLatestBill: () => setLatestBill(null),
    gameMode,
    marketSeed,
    storyArcs,
    maxGameDay,
    isGameComplete,
    stocks,
    news,
    newsHistory,
    getStock,
    getHistory,
    getRelatedNews,
    loading,
    error,
    sessionId: session?.id ?? null,
    reloadSession: loadOrCreateSession,
    syncSessionValue,
  }), [
    account, addCash, addToWatchlist, buyStock, error, gameDay, gameMode, getHistory, getRelatedNews,
    getStock, getTradeQuote, loading, loadOrCreateSession, news, newsHistory, resetAccount, sellStock,
    marketSeed, setCash, setGameDay, setHolding, session, stocks, storyArcs, syncSessionValue,
    maxGameDay, isGameComplete, isWatchlisted, removeFromWatchlist,
    latestBill, toggleWatchlist, watchlistStocks, watchlistSymbols,
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
