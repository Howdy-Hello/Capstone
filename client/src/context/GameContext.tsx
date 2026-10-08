import { DatabaseStock, DatabasePrice, getHistoryForDatabaseStock, round2 } from "../data/databaseMarket";
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";

import {
<<<<<<< HEAD
=======
  generateMarketSeedCode,
  getNewsForGameDay,
  getNewsUpToGameDay,
  getRelatedNewsBySymbol,
  getSelectedStoryArcKeys,
  getStockHistoryBySymbol,
  getStocksForGameDay,
  enrichMarketNews,
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
  MarketNews,
  mockStockCompanies,
  normalizeMarketSeed,
  Stock,
  StockPriceHistory,
} from "../data/mockStocks";
import { asNumber, DatabaseStock, mapStockFromHistory } from "../data/infiniteMarket";
import {
  historyFromRows,
  LIMITED_RUN_DAYS,
  MAX_RUN_DAY,
  SessionPriceRow,
  stockFromCompanyHistory,
} from "../data/sessionMarket";
import {
  getPortfolioValue,
  getSlippageAdjustedPrice,
  PortfolioHolding,
  TradingAccount,
} from "../data/tradingState";
import { supabase } from "../lib/supabase";
import { advanceSessionDay, ensureSessionMarket, syncGameState } from "../lib/api";
import { recordTradeJournalEntry, TradeJournalInput } from "../lib/tradeJournal";
import { useAuth } from "./AuthContext";

// The run's market lives in Supabase: the API server generates each day's
// prices and news into session_stock_prices / session_market_news, and is the
// only thing that moves a run's day forward. This context reads those rows and
// calls the server; it no longer generates prices or writes cash itself.

const STARTING_CASH = 2_000;
const GAME_PHASE_STORAGE_KEY = "stockpilot-market-phase";
export const LIMITED_GAME_DAYS = LIMITED_RUN_DAYS;
export const MAX_GAME_DAY = MAX_RUN_DAY;
export const WEEKLY_BILL_ITEMS = [
  // Must sum to the amount server_advance_game_day charges per cycle
  // (supabase/migrations/202609250001_server_authoritative_market.sql).
  { label: "Rent", amount: 60, detail: "Housing for one weekly cycle" },
  { label: "Food", amount: 30, detail: "Groceries and everyday meals" },
  { label: "Utilities", amount: 10, detail: "Power, water, and connectivity" },
] as const;
export const WEEKLY_BILL_TOTAL = WEEKLY_BILL_ITEMS.reduce((sum, item) => sum + item.amount, 0);
export type GameMode = "infinite" | "limited_30";
export type MarketPhase = "market_open" | "after_hours";

export type BillCharge = {
  cycles: number;
  total: number;
  paid: number;
  shortfall: number;
  day: number;
};

// Value is "after_hours:<day>" so the phase only applies to the day it was set
// on. A bare flag leaked into restored save slots (same session id, earlier
// day) and into days advanced on another device, revealing news early.
function marketPhaseStorageKey(sessionId: string) {
  return `${GAME_PHASE_STORAGE_KEY}:${sessionId}`;
}

<<<<<<< HEAD
=======
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

>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
type GameSession = {
  id: string;
  current_day: number;
  cash_balance: number | string;
  game_mode?: GameMode | null;
  game_seed?: string | null;
  market_phase?: MarketPhase;
  advisor_ids?: string[];
  trusted_state?: boolean;
  cash_streak?: number;
  gain_streak?: number;
};

const SESSION_COLUMNS = "id, current_day, cash_balance, game_mode, game_seed";

type TradeResult = {
  execution_price: number;
  cash: number | string;
  symbol: string;
  quantity: number;
  average_purchase_price: number | string;
  price?: number | string;
};

type GameContextValue = {
  account: TradingAccount;
  buyStock: (stock: Stock, quantity?: number, journal?: TradeJournalInput) => Promise<boolean>;
  sellStock: (stock: Stock, quantity?: number, journal?: TradeJournalInput) => Promise<boolean>;
  getTradeQuote: (stock: Stock, tradeType: "buy" | "sell", quantity?: number) => {
    basePrice: number; effectivePrice: number; slippage: number; total: number;
  };
<<<<<<< HEAD
  /** Start a new run. Resolves false (with `error` set) if it failed. */
  resetAccount: (mode?: GameMode) => Promise<boolean>;
  /** Spend cash (negative amounts only). Resolves false if it was refused. */
  addCash: (amount: number) => Promise<boolean>;
=======
  resetAccount: (mode?: GameMode) => Promise<void>;
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
  addToWatchlist: (stock: Stock) => Promise<void>;
  removeFromWatchlist: (stock: Stock) => Promise<void>;
  toggleWatchlist: (stock: Stock) => Promise<void>;
  isWatchlisted: (symbol: string) => boolean;
  watchlistSymbols: string[];
  watchlistStocks: Stock[];
  gameDay: number;
  setGameDay: (day: number | ((current: number) => number)) => Promise<void>;
  /** True while a day advance is in flight; trading and advancing are blocked. */
  advancing: boolean;
  marketPhase: MarketPhase;
  closeMarket: () => Promise<void>;
  actionPending: boolean;
  advisorIds: string[];
  verifiedRun: boolean;
  cashStreak: number;
  gainStreak: number;
  hireAdvisor: (advisorId: string) => Promise<boolean>;
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

function normalizeGameMode(value: string | null | undefined): GameMode {
  return value === "limited_30" ? "limited_30" : "infinite";
}

function clampGameDayForMode(day: number, mode: GameMode) {
  const whole = Number.isFinite(day) ? Math.floor(day) : 1;
  return Math.max(1, Math.min(mode === "limited_30" ? LIMITED_GAME_DAYS : MAX_GAME_DAY, whole));
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : (error as { message?: string } | null)?.message ?? fallback;
}

// PostgREST caps a single response at 1000 rows by default and truncates
// silently, so any table that can outgrow that is read page by page.
// Callers must order by a unique key so pages don't overlap.
const PAGE_SIZE = 1000;

<<<<<<< HEAD
async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error: pageError } = await page(from, from + PAGE_SIZE - 1);
    if (pageError) throw pageError;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

type SessionMarket = { rows: SessionPriceRow[]; news: Map<number, MarketNews[]> };

/** The run's stored prices and news from `fromDay` up to its current day. */
async function fetchSessionMarket(sessionId: string, fromDay: number): Promise<SessionMarket> {
  const [rows, newsRows] = await Promise.all([
    fetchAllPages<SessionPriceRow>((from, to) => supabase
      .from("session_stock_prices")
      .select("game_day, symbol, open_price, high_price, low_price, close_price, volume, event_impact")
      .eq("session_id", sessionId)
      .gte("game_day", fromDay)
      .order("game_day")
      .order("symbol")
      .range(from, to)),
    fetchAllPages<{ game_day: number; items: MarketNews[] | null }>((from, to) => supabase
      .from("session_market_news")
      .select("game_day, items")
      .eq("session_id", sessionId)
      .gte("game_day", fromDay)
      .order("game_day")
      .range(from, to)),
  ]);

  return {
    rows,
    news: new Map(newsRows.map((row) => [row.game_day, row.items ?? []])),
=======
function mapDatabaseEvent(row: DatabaseEvent): MarketNews {
  const impacts = row.event_stock_impacts ?? [];
  const expectedImpact = impacts[0] ? asNumber(impacts[0].expected_impact) : 0;
  const impactByTicker = impacts.reduce<NonNullable<MarketNews["impactByTicker"]>>((all, impact) => {
    const symbol = relatedSymbol(impact.stocks);
    if (symbol) all[symbol] = {
      expectedImpact: asNumber(impact.expected_impact),
      actualImpact: asNumber(impact.actual_impact),
    };
    return all;
  }, {});

  return enrichMarketNews({
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
    impactByTicker,
  });
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
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
  };
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [session, setSession] = useState<GameSession | null>(null);
  const [account, setAccount] = useState<TradingAccount>(defaultAccount);
  const [gameMode, setGameModeState] = useState<GameMode>("infinite");
  const [marketSeed, setMarketSeed] = useState(() => normalizeMarketSeed(null));
  const [gameDay, setGameDayState] = useState(1);
  const [marketPhase, setMarketPhase] = useState<MarketPhase>("market_open");
  const [databaseStocks, setDatabaseStocks] = useState<DatabaseStock[]>([]);
  const [priceRows, setPriceRows] = useState<SessionPriceRow[]>([]);
  const [newsByDay, setNewsByDay] = useState<Map<number, MarketNews[]>>(() => new Map());
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestBill, setLatestBill] = useState<BillCharge | null>(null);
  const gameDayRef = useRef(gameDay);
<<<<<<< HEAD
  // One market mutation at a time: a trade sent mid-advance was priced
  // against the old day, and a double click could close and advance at once.
  const busyRef = useRef(false);
=======
  const actionLock = useRef(false);
  const [actionPending, setActionPending] = useState(false);
  const pendingTrade = useRef<{ key: string; id: string } | null>(null);
  const beginAction = () => {
    if (actionLock.current) return false;
    actionLock.current = true;
    setError(null);
    setActionPending(true);
    return true;
  };
  const endAction = () => { actionLock.current = false; setActionPending(false); };
  const reportError = (error: any) => {
    console.error("Gameplay operation failed", error);
    const message = String(error?.message ?? "");
    const safe = ["Not enough cash", "Not enough shares", "Your game has changed. Reload before trying again.", "Challenge complete. Start a new run to play.", "Market quote unavailable. Try again."];
    setError(safe.includes(message) ? message : "Your game could not be saved. Check your connection and try again.");
  };
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)

  useEffect(() => {
    gameDayRef.current = gameDay;
  }, [gameDay]);

<<<<<<< HEAD
  const loadStocks = useCallback(async () => {
    const { data, error: stocksError } = await supabase
      .from("stocks")
      .select("*")
      .eq("is_active", true)
      .order("symbol");
    if (stocksError) throw stocksError;
    setDatabaseStocks((data ?? []) as DatabaseStock[]);
=======
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
      (async () => {
        const prices: DatabasePrice[] = [];
        for (let start = 0; ; start += 1000) {
          const page = await supabase.from("stock_prices")
            .select("id,game_day,open_price,high_price,low_price,close_price,volume,event_impact,stocks(symbol)")
            .gt("game_day", 0).order("game_day").order("id").range(start, start + 999);
          if (page.error) throw page.error;
          prices.push(...page.data as unknown as DatabasePrice[]);
          if (page.data.length < 1000) return { data: prices, error: null };
        }
      })(),
    ]);

    if (stocksResult.error) throw stocksResult.error;
    if (eventsResult.error) throw eventsResult.error;
    if (pricesResult.error) throw pricesResult.error;

    setDatabaseStocks((stocksResult.data ?? []) as DatabaseStock[]);
    setDatabaseEvents((eventsResult.data ?? []) as unknown as DatabaseEvent[]);
    setDatabasePrices((pricesResult.data ?? []) as unknown as DatabasePrice[]);
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
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

  /** Make the server catch the run's market up, then load it into state. */
  const applySession = useCallback(async (activeSession: GameSession) => {
    await ensureSessionMarket(activeSession.id);
    const [holdings, market] = await Promise.all([
      loadHoldings(activeSession.id),
      fetchSessionMarket(activeSession.id, 1),
    ]);

    const activeMode = normalizeGameMode(activeSession.game_mode);
    const currentDay = clampGameDayForMode(activeSession.current_day, activeMode);
    const storedPhase = localStorage.getItem(marketPhaseStorageKey(activeSession.id));

    gameDayRef.current = currentDay;
    setSession(activeSession);
    setGameModeState(activeMode);
    setMarketSeed(normalizeMarketSeed(activeSession.game_seed));
    setPriceRows(market.rows);
    setNewsByDay(market.news);
    setGameDayState(currentDay);
    setMarketPhase(storedPhase === `after_hours:${currentDay}` ? "after_hours" : "market_open");
    setAccount({ cash: asNumber(activeSession.cash_balance), holdings });
  }, [loadHoldings]);

  const loadOrCreateSession = useCallback(async () => {
    if (!user) {
      setSession(null);
      setAccount(defaultAccount);
      setPriceRows([]);
      setNewsByDay(new Map());
      setWatchlistSymbols([]);
      return;
    }

    const { data: existing, error: sessionError } = await supabase
      .from("game_sessions")
<<<<<<< HEAD
      .select(SESSION_COLUMNS)
=======
      .select("id, current_day, cash_balance, game_mode, game_seed, market_phase, advisor_ids, trusted_state, cash_streak, gain_streak")
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

<<<<<<< HEAD
=======
    const { data: existing, error: sessionError } = sessionResult;

>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
    if (sessionError) throw sessionError;

    let activeSession = existing as GameSession | null;

    if (!activeSession) {
      const { data, error: createError } = await supabase.rpc("start_new_game_with_mode", {
        target_game_mode: "infinite",
      });
      if (createError) throw createError;
      activeSession = data as GameSession;
    }

<<<<<<< HEAD
    await applySession(activeSession);
=======
    // Legacy advisor purchases have no server receipt. Import only into their
    // original practice run; this cannot grant ownership in a verified run.
    if (!activeSession.trusted_state && !(activeSession.advisor_ids ?? []).includes("riley")) {
      let owned: unknown = [];
      try { owned = JSON.parse(localStorage.getItem(`stockpilot-advisors-${activeSession.id}`) ?? "[]"); } catch { /* ignore corrupt legacy data */ }
      if (Array.isArray(owned) && owned.includes("riley")) {
        const migrated = await supabase.rpc("import_legacy_advisor", { target_session_id: activeSession.id });
        if (migrated.error) throw migrated.error;
        activeSession = migrated.data as GameSession;
      }
    }

    const holdings = await loadHoldings(activeSession.id);
    const activeMode = normalizeGameMode(activeSession.game_mode);
    const activeSeed = normalizeMarketSeed(activeSession.game_seed);
    const currentDay = clampGameDayForMode(activeSession.current_day, activeMode);

    localStorage.setItem(gameDayStorageKey(activeSession.id), currentDay.toString());
    localStorage.setItem(GAME_DAY_STORAGE_KEY, currentDay.toString());
    localStorage.setItem(marketSeedStorageKey(activeSession.id), activeSeed);
    localStorage.setItem(GAME_SEED_STORAGE_KEY, activeSeed);
    gameDayRef.current = currentDay;

    setSession(activeSession);
    setGameModeState(activeMode);
    setMarketSeed(activeSeed);
    setGameDayState(currentDay);
    setMarketPhase(activeSession.market_phase ?? "market_open");
    setLatestBill(null);
    setAccount({
      cash: asNumber(activeSession.cash_balance),
      holdings,
    });
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
    await loadWatchlist();
  }, [applySession, loadWatchlist, user]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([loadStocks(), loadOrCreateSession()]);
      } catch (loadError) {
        if (!cancelled) {
          setError(errorMessage(loadError, "Could not load the game."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadStocks, loadOrCreateSession]);

  // Stored rows up to the current day, per ticker. RLS already hides later
  // days; the filter keeps a just-advanced day from showing before gameDay
  // itself updates.
  const histories = useMemo(() => {
    const bySymbol = new Map<string, SessionPriceRow[]>();
    for (const row of priceRows) {
      if (row.game_day > gameDay) continue;
      const list = bySymbol.get(row.symbol);
      if (list) list.push(row);
      else bySymbol.set(row.symbol, [row]);
    }
    return new Map(Array.from(bySymbol, ([symbol, rows]) => [symbol, historyFromRows(rows)]));
  }, [gameDay, priceRows]);

  const stocks = useMemo(() => {
    if (gameMode === "limited_30") {
      return mockStockCompanies
        .filter((company) => company.isActive)
        .map((company) => stockFromCompanyHistory(company, histories.get(company.symbol) ?? []));
    }

    return databaseStocks
      .filter((stock) => stock.is_active)
      .map((stock) => mapStockFromHistory(stock, histories.get(stock.symbol) ?? []));
  }, [databaseStocks, gameMode, histories]);

  // News for day D is published after the close on day D, so while the market
  // is open the newest visible day is the previous one.
  const visibleNewsDay = gameDay - (marketPhase === "market_open" ? 1 : 0);

  const news = useMemo(() => (
    marketPhase === "market_open" ? [] : newsByDay.get(gameDay) ?? []
  ), [gameDay, marketPhase, newsByDay]);

  // Every story the player could have seen so far, newest first. The inbox
  // renders news as mail alongside the in-game messages, and a mailbox holding
  // only today's headlines would read as broken.
  const newsHistory = useMemo(() => {
    const all: MarketNews[] = [];
    for (let day = visibleNewsDay; day >= 1; day -= 1) all.push(...(newsByDay.get(day) ?? []));
    return all;
  }, [newsByDay, visibleNewsDay]);

  const getHistory = useCallback((symbol: string) => (
    histories.get(symbol.toUpperCase()) ?? []
  ), [histories]);

  const getStock = useCallback(
    (symbol: string) => stocks.find(
      (stock) => stock.symbol.toLowerCase() === symbol.toLowerCase()
    ),
    [stocks]
  );

  // Ascending: StockDetails renders relatedNews.slice(-8), the newest eight.
  const getRelatedNews = useCallback((symbol: string) => (
    newsHistory.filter((event) => event.relatedTickers.includes(symbol)).reverse()
  ), [newsHistory]);

<<<<<<< HEAD
  const closeMarket = useCallback(() => {
    if (busyRef.current) return;
    setMarketPhase("after_hours");
    if (session) localStorage.setItem(marketPhaseStorageKey(session.id), `after_hours:${gameDayRef.current}`);
=======
  const closeMarket = useCallback(async () => {
    if (!session || !beginAction()) return;
    try {
      const { error } = await supabase.rpc("close_market", { target_session_id: session.id, target_game_day: gameDayRef.current });
      if (error) throw error;
      setMarketPhase("after_hours");
      setError(null);
    } catch (error) { reportError(error); } finally { endAction(); }
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
  }, [session]);

  const setGameDay = useCallback(async (
    day: number | ((current: number) => number)
  ) => {
    if (!session || busyRef.current) return;
    const currentDay = gameDayRef.current;
    const requested = typeof day === "function" ? day(currentDay) : day;
    const next = clampGameDayForMode(requested, gameMode);

    if (next < currentDay) {
      setError("Game days only move forward. Load a save slot to go back.");
      return;
    }
    if (next === currentDay) return;

<<<<<<< HEAD
    busyRef.current = true;
    setAdvancing(true);
    try {
      const result = await advanceSessionDay(session.id, next);
=======
    if (!beginAction()) return;
    try {
    await syncGameState({ sessionId: session.id, day: next });
    const { data, error: dayError } = await supabase.rpc("advance_game_day", {
      target_session_id: session.id,
      target_game_day: next,
      target_game_mode: gameMode,
    });

    if (dayError) {
      reportError(dayError);
    } else {
      const result = data as {
        day: number;
        cash: number | string;
        cycles_charged: number;
        bill_total: number | string;
        amount_paid: number | string;
        shortfall: number | string;
      };
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
      const appliedDay = Number(result.day);
      const market = await fetchSessionMarket(session.id, currentDay + 1);

      setPriceRows((rows) => [...rows.filter((row) => row.game_day <= currentDay), ...market.rows]);
      setNewsByDay((current) => {
        const merged = new Map(Array.from(current).filter(([storedDay]) => storedDay <= currentDay));
        market.news.forEach((items, storedDay) => merged.set(storedDay, items));
        return merged;
      });
      setMarketPhase("market_open");
      localStorage.setItem(marketPhaseStorageKey(session.id), "market_open");
      gameDayRef.current = appliedDay;
      setGameDayState(appliedDay);
      const refreshed = await supabase.from("game_sessions").select("*").eq("id", session.id).single();
      if (refreshed.error) throw refreshed.error;
      setSession(refreshed.data as GameSession);
      setAccount((current) => ({ ...current, cash: asNumber(result.cash) }));
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
    } catch (advanceError) {
      setError(errorMessage(advanceError, "Could not advance the day."));
    } finally {
      busyRef.current = false;
      setAdvancing(false);
    }
    } catch (error) { reportError(error); } finally { endAction(); }
  }, [gameMode, session]);

  const getTradeQuote = useCallback((
    stock: Stock,
    tradeType: "buy" | "sell",
    quantity = 1
  ) => {
    // Price from the live market, not the Stock object the caller captured:
    // a trade dialog left open across a day change held yesterday's price.
    const live = stocks.find((item) => item.symbol === stock.symbol) ?? stock;
    const netWorth = account.cash + getPortfolioValue(account, stocks);
<<<<<<< HEAD
    const tradeValue = live.currentPrice * quantity;
    const effectivePrice = getSlippageAdjustedPrice(live.currentPrice, tradeType, tradeValue, netWorth);
    const slippage = live.currentPrice > 0 ? (effectivePrice - live.currentPrice) / live.currentPrice : 0;
=======
    stock = stocks.find((current) => current.symbol === stock.symbol) ?? stock;
    const tradeValue = stock.currentPrice * quantity;
    const effectivePrice = getSlippageAdjustedPrice(stock.currentPrice, tradeType, tradeValue, netWorth);
    const slippage = stock.currentPrice > 0 ? (effectivePrice - stock.currentPrice) / stock.currentPrice : 0;
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
    return {
      basePrice: live.currentPrice,
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
<<<<<<< HEAD
    if (!session || !user || busyRef.current) return false;

    const quote = getTradeQuote(stock, tradeType, quantity);

    if (tradeType === "buy" && account.cash < quote.total) return false;
    if (tradeType === "sell") {
      const holding = account.holdings.find((h) => h.symbol === stock.symbol);
      if (!holding || holding.shares < quantity) return false;
    }

    busyRef.current = true;
    const tradeDay = gameDayRef.current;
    let result: TradeResult;
    try {
      // The server prices the trade from the stored market; target_price and
      // target_game_day are kept only for the function's signature.
      const { data, error: tradeError } = await supabase.rpc("execute_trade", {
        target_session_id: session.id,
        target_symbol: stock.symbol,
        target_trade_type: tradeType,
        target_price: quote.effectivePrice,
        target_game_day: tradeDay,
        target_quantity: quantity,
      });

      if (tradeError) {
        setError(tradeError.message);
        return false;
      }
      result = data as TradeResult;
    } finally {
      busyRef.current = false;
    }
=======
    if (!session || !user || !beginAction()) return false;
    try {
    if (gameMode === "limited_30" && gameDay >= LIMITED_GAME_DAYS) {
      throw new Error("Challenge complete. Start a new run to play.");
    }
    const currentStock = stocks.find((current) => current.symbol === stock.symbol);
    if (!currentStock || !Number.isInteger(quantity) || quantity <= 0) throw new Error("Invalid trade");
    stock = currentStock;
    const key = `${session.id}:${gameDay}:${stock.symbol}:${tradeType}:${quantity}`;
    if (pendingTrade.current?.key !== key) pendingTrade.current = { key, id: crypto.randomUUID() };
    await syncGameState({ sessionId: session.id, day: gameDay });
    const { data, error: tradeError } = await supabase.rpc("execute_trade_checked", {
      target_session_id: session.id,
      target_symbol: stock.symbol,
      target_trade_type: tradeType,
      target_game_day: gameDay,
      target_quantity: quantity,
      operation_id: pendingTrade.current.id,
    });
    if (tradeError) throw tradeError;
    pendingTrade.current = null;
    const result = data as TradeResult;
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)

    setAccount((current) => {
      const existing = current.holdings.find(
        (holding) => holding.symbol === result.symbol
      );
      const nextQuantity = Number(result.quantity);
      let holdings = current.holdings;

      if (nextQuantity === 0) {
        holdings = holdings.filter(
          (holding) => holding.symbol !== result.symbol
        );
      } else if (existing) {
        holdings = holdings.map((holding) =>
          holding.symbol === result.symbol
            ? {
                ...holding,
                shares: nextQuantity,
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
            shares: nextQuantity,
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
<<<<<<< HEAD
        executionPrice: result.price !== undefined ? asNumber(result.price) : quote.effectivePrice,
        gameDay: tradeDay,
=======
        executionPrice: Number(result.execution_price),
        gameDay,
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
        journal,
      });
      if (!journalSaved) {
        setError("The trade completed, but its decision journal could not be saved.");
        return true;
      }
    }

    try { await loadOrCreateSession(); }
    catch (error) {
      console.error("Trade saved, refresh failed", error);
      setError("Your trade was saved. Reload to refresh your account.");
      return true;
    }
    setError(null);
    return true;
<<<<<<< HEAD
  }, [account.cash, account.holdings, getTradeQuote, session, user]);
=======
    } catch (error) { reportError(error); return false; } finally { endAction(); }
  }, [gameMode, stocks, gameDay, loadOrCreateSession, session, user]);
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)

  const buyStock = useCallback(
    (stock: Stock, quantity = 1, journal?: TradeJournalInput) => executeTrade(stock, "buy", quantity, journal),
    [executeTrade]
  );

  const sellStock = useCallback(
    (stock: Stock, quantity = 1, journal?: TradeJournalInput) => executeTrade(stock, "sell", quantity, journal),
    [executeTrade]
  );

  const resetAccount = useCallback(async (mode: GameMode = gameMode) => {
    if (!user || busyRef.current) return false;
    const nextMode = normalizeGameMode(mode);

    busyRef.current = true;
    setLoading(true);
    try {
      // The server picks the new run's seed.
      const { data, error: resetError } = await supabase.rpc("start_new_game_with_mode", {
        target_game_mode: nextMode,
      });
      if (resetError) throw resetError;

      const nextSession = data as GameSession;
      localStorage.setItem(marketPhaseStorageKey(nextSession.id), "market_open");
      await applySession(nextSession);
      setLatestBill(null);
      setError(null);
      return true;
    } catch (resetError) {
      setError(errorMessage(resetError, "Could not start a new run."));
      return false;
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [applySession, gameMode, user]);

  const addCash = useCallback(async (amount: number) => {
    if (!session) return false;
    if (!(amount < 0)) {
      setError("Cash is managed by the game server and can't be added directly.");
      return false;
    }

<<<<<<< HEAD
    const { data, error: spendError } = await supabase.rpc("spend_session_cash", {
      target_session_id: session.id,
      p_amount: Number((-amount).toFixed(2)),
=======
    if (!beginAction()) return;
    try {
    const { data, error: resetError } = await supabase.rpc("start_new_game_with_mode", {
      target_game_mode: nextMode,
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
    });
    if (spendError) {
      setError(spendError.message);
      return false;
    }

<<<<<<< HEAD
    setAccount((current) => ({ ...current, cash: asNumber(data as number | string) }));
    return true;
  }, [session]);
=======
    const nextSession = data as GameSession;
    const persistedSeed = normalizeMarketSeed(nextSession.game_seed);
    localStorage.setItem(gameDayStorageKey(nextSession.id), "1");
    localStorage.setItem(GAME_DAY_STORAGE_KEY, "1");
    localStorage.setItem(marketSeedStorageKey(nextSession.id), persistedSeed);
    localStorage.setItem(marketPhaseStorageKey(nextSession.id), "market_open");
    localStorage.setItem(GAME_SEED_STORAGE_KEY, persistedSeed);
    gameDayRef.current = 1;
    setSession({ ...nextSession, game_seed: persistedSeed });
    setGameModeState(nextMode);
    setMarketSeed(persistedSeed);
    setAccount(defaultAccount);
    setGameDayState(1);
    setMarketPhase("market_open");
    setLatestBill(null);
    setError(null);
    } catch (error) { reportError(error); } finally { endAction(); }
  }, [gameMode, marketSeed, user]);

  const hireAdvisor = useCallback(async (advisorId: string) => {
    if (!session || !beginAction()) return false;
    try {
      await syncGameState({ sessionId: session.id, day: gameDay });
      const { data, error } = await supabase.rpc("hire_advisor", {
        target_session_id: session.id, target_game_day: gameDay, advisor_id: advisorId,
      });
      if (error) throw error;
      setSession(data as GameSession);
      setAccount(current => ({ ...current, cash: Number(data.cash_balance) }));
      setError(null);
      return true;
    } catch (error) { reportError(error); return false; } finally { endAction(); }
  }, [session, gameDay]);
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)

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
    try {
<<<<<<< HEAD
      await syncGameState(session.id);
    } catch (syncError) {
      setError(errorMessage(syncError, "Could not sync session value."));
=======
      await syncGameState({
        sessionId: session.id,
        portfolioValue,
        netWorth,
        gameMode,
        day: gameDay,
      });
    } catch (syncError: any) {
      reportError(syncError);
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
    }
  }, [loading, session]);

  const maxGameDay = gameMode === "limited_30" ? LIMITED_GAME_DAYS : null;
  const isGameComplete = maxGameDay !== null && gameDay >= maxGameDay;
  // Arcs the player has actually seen. The selection itself comes from the
  // server's secret-keyed seed, so it can't be recomputed here.
  const storyArcs = useMemo(() => (
    Array.from(new Set(newsHistory
      .map((item) => item.arcKey)
      .filter((key): key is string => Boolean(key) && key !== "opening_tutorial")))
  ), [newsHistory]);
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
<<<<<<< HEAD
    addCash,
=======
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isWatchlisted,
    watchlistSymbols,
    watchlistStocks,
    gameDay,
    setGameDay,
    advancing,
    marketPhase,
    closeMarket,
    actionPending,
    advisorIds: session?.advisor_ids ?? [],
    verifiedRun: session?.trusted_state ?? false,
    cashStreak: session?.cash_streak ?? 0,
    gainStreak: session?.gain_streak ?? 0,
    hireAdvisor,
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
<<<<<<< HEAD
  }), [
    account, addCash, addToWatchlist, advancing, buyStock, closeMarket, error, gameDay, gameMode, getHistory,
    getRelatedNews, getStock, getTradeQuote, loading, loadOrCreateSession, news, newsHistory, resetAccount,
    sellStock, marketSeed, setGameDay, session, stocks, storyArcs, syncSessionValue,
=======
  }), [actionPending, hireAdvisor,
    account, addToWatchlist, buyStock, closeMarket, error, gameDay, gameMode, getHistory, getRelatedNews,
    getStock, getTradeQuote, loading, loadOrCreateSession, news, newsHistory, resetAccount, sellStock,
    marketSeed, setGameDay, session, stocks, storyArcs, syncSessionValue,
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
    marketPhase, maxGameDay, isGameComplete, isWatchlisted, removeFromWatchlist,
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
