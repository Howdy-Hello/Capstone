import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";

import {
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
  withCurrentCopy,
} from "../data/sessionMarket";
import {
  getCumulativeTradeTotal,
  getPortfolioValue,
  PortfolioHolding,
  TradingAccount,
} from "../data/tradingState";
import { isMissingDbObject, supabase } from "../lib/supabase";
import { advanceSessionDay, ApiError, closeSessionMarket, ensureSessionMarket, syncGameState } from "../lib/api";
import { recordTradeJournalEntry, TradeJournalInput } from "../lib/tradeJournal";
import { useAuth } from "./AuthContext";
import { ownershipKey, readOwnedAdvisorIds } from "../hooks/useAdvisor";

// Riley's price; matches hire_advisor and ADVISORS in useAdvisor.
const ADVISOR_COST = 100;

// The run's market lives in Supabase: the API server generates each day's
// prices and news into session_stock_prices / session_market_news, and is the
// only thing that moves a run's day forward. This context reads those rows and
// calls the server; it no longer generates prices or writes cash itself.

const STARTING_CASH = 2_000;
const GAME_PHASE_STORAGE_KEY = "stockpilot-market-phase";
/** The server's wording when a trade arrives after the close; the UI reuses it. */
export const MARKET_CLOSED_MESSAGE = "The market is closed. Advance to the next day to trade.";
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

type GameSession = {
  id: string;
  current_day: number;
  cash_balance: number | string;
  game_mode?: GameMode | null;
  game_seed?: string | null;
  unpaid_bills?: number | string | null;
  market_phase?: MarketPhase;
  advisor_ids?: string[];
  ranked?: boolean;
  cash_discipline_streak?: number;
  hot_streak_days?: number;
};

// "*" rather than a column list: naming a column a not-yet-applied migration
// adds (unpaid_bills, market_phase, ...) made PostgREST reject the whole query
// and the game would not load (BUG-038). Missing fields fall back to defaults.
const SESSION_COLUMNS = "*";

type TradeResult = {
  /** Absent from the legacy execute_trade, which only returns `price`. */
  execution_price?: number | string;
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
  /** Start a new run. Resolves false (with `error` set) if it failed. */
  resetAccount: (mode?: GameMode) => Promise<boolean>;
  /** Spend cash (negative amounts only). Resolves false if it was refused. */
  addCash: (amount: number) => Promise<boolean>;
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
  /** Whether the loaded run counts for the leaderboards; null before a run loads or on a schema without the column. */
  ranked: boolean | null;
  cashStreak: number;
  gainStreak: number;
  hireAdvisor: (advisorId: string) => Promise<boolean>;
  latestBill: BillCharge | null;
  clearLatestBill: () => void;
  /** Shares traded today per "buy:SYMBOL" / "sell:SYMBOL"; tells which shares were held overnight. */
  tradedToday: Record<string, number>;
  gameMode: GameMode;
  marketSeed: string;
  storyArcs: string[];
  maxGameDay: number | null;
  isGameComplete: boolean;
  stocks: Stock[];
  /** The newest brief: the previous day's while the market is open, today's after the close. */
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

function fetchSessionRow(sessionId: string) {
  return supabase.from("game_sessions").select(SESSION_COLUMNS).eq("id", sessionId).single();
}

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
    news: new Map(newsRows.map((row) => [row.game_day, withCurrentCopy(row.items)])),
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
  // Hires recorded in this browser when the database has no advisor_ids column.
  const [localAdvisorIds, setLocalAdvisorIds] = useState<string[]>([]);
  // Shares traded today per "buy:SYMBOL" / "sell:SYMBOL": slippage is charged
  // on the day's cumulative quantity (BUG-016).
  const [tradedToday, setTradedToday] = useState<Record<string, number>>({});
  const [databaseStocks, setDatabaseStocks] = useState<DatabaseStock[]>([]);
  const [priceRows, setPriceRows] = useState<SessionPriceRow[]>([]);
  const [newsByDay, setNewsByDay] = useState<Map<number, MarketNews[]>>(() => new Map());
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestBill, setLatestBill] = useState<BillCharge | null>(null);
  const gameDayRef = useRef(gameDay);
  // One market mutation at a time: a trade sent mid-advance was priced
  // against the old day, and a double click could close and advance at once.
  const busyRef = useRef(false);
  const [actionPending, setActionPending] = useState(false);
  const pendingTrade = useRef<{ key: string; id: string } | null>(null);
  // BUG-060: set when another tab changes this run (see the storage listener
  // below); cleared when a reload starts. Assigned once reloadSession exists.
  const staleRunRef = useRef(false);
  const reloadSessionRef = useRef<(() => Promise<void>) | null>(null);
  const beginAction = useCallback(() => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setError(null);
    setActionPending(true);
    return true;
  }, []);
  const endAction = useCallback(() => {
    busyRef.current = false;
    setActionPending(false);
    // A change from another tab arrived mid-action: reload now, before the
    // player can act on the stale copy.
    if (staleRunRef.current) void reloadSessionRef.current?.().catch(() => { /* reloadSession reports it */ });
  }, []);
  const reportError = useCallback((error: unknown) => {
    const message = errorMessage(error, "");
    const safe = ["Not enough cash", "Not enough shares", "Your game has changed. Reload before trying again.", "Challenge complete. Start a new run to play.", MARKET_CLOSED_MESSAGE, "Market data for this day is not ready yet"];
    setError(error instanceof ApiError || safe.includes(message) ? message : "Your game could not be saved. Check your connection and try again.");
  }, []);

  useEffect(() => {
    gameDayRef.current = gameDay;
  }, [gameDay]);

  // BUG-060: another tab of this browser closed or advanced this run's market
  // (closeMarket and setGameDay write this key; storage events only fire in
  // the other tabs). Disable trading at once on a close, then reload the run
  // so day, phase and cash match instead of acting on a stale copy. If an
  // action is in flight the reload can't start yet; staleRunRef makes
  // endAction run it as soon as that action finishes.
  const activeSessionId = session?.id ?? null;
  useEffect(() => {
    if (!activeSessionId) return;
    const key = marketPhaseStorageKey(activeSessionId);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key || event.newValue === null || event.newValue === event.oldValue) return;
      staleRunRef.current = true;
      if (event.newValue === `after_hours:${gameDayRef.current}`) setMarketPhase("after_hours");
      void reloadSessionRef.current?.().catch(() => { /* reloadSession reports the error */ });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [activeSessionId]);

  const loadStocks = useCallback(async () => {
    const { data, error: stocksError } = await supabase
      .from("stocks")
      .select("*")
      .eq("is_active", true)
      .order("symbol");
    if (stocksError) throw stocksError;
    setDatabaseStocks((data ?? []) as DatabaseStock[]);
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
    const [holdings, market, todayTrades, refreshed] = await Promise.all([
      loadHoldings(activeSession.id),
      fetchSessionMarket(activeSession.id, 1),
      supabase
        .from("trades")
        .select("trade_type, quantity, stocks (symbol)")
        .eq("session_id", activeSession.id)
        .eq("game_day", activeSession.current_day),
      // Preparing the market can change the row (net worth, regenerated
      // market), so use the fresh copy rather than the earlier snapshot.
      supabase.from("game_sessions").select(SESSION_COLUMNS).eq("id", activeSession.id).single(),
    ]);
    if (todayTrades.error) throw todayTrades.error;
    if (refreshed.error) throw refreshed.error;
    activeSession = refreshed.data as GameSession;
    const traded: Record<string, number> = {};
    for (const row of (todayTrades.data ?? []) as any[]) {
      const stock = Array.isArray(row.stocks) ? row.stocks[0] : row.stocks;
      const key = `${row.trade_type}:${stock?.symbol}`;
      traded[key] = (traded[key] ?? 0) + Number(row.quantity);
    }

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
    setLocalAdvisorIds(readOwnedAdvisorIds(activeSession.id, currentDay));
    setTradedToday(traded);
    setMarketPhase(activeSession.market_phase ?? (storedPhase === `after_hours:${currentDay}` ? "after_hours" : "market_open"));
    setAccount({
      cash: asNumber(activeSession.cash_balance),
      holdings,
      unpaidBills: asNumber(activeSession.unpaid_bills),
    });
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
      .select(SESSION_COLUMNS)
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) throw sessionError;

    let activeSession = existing as GameSession | null;

    if (!activeSession) {
      const { data, error: createError } = await supabase.rpc("start_new_game_with_mode", {
        target_game_mode: "infinite",
      });
      if (createError) throw createError;
      activeSession = data as GameSession;
    }

    await applySession(activeSession);
    await loadWatchlist();
  }, [applySession, loadWatchlist, user]);

  // Retry after a failed load: stock metadata, market rows, holdings,
  // watchlist and session state.
  const reloadSession = useCallback(async () => {
    if (!beginAction()) return;
    // Cleared up front, so a failed reload shows its error and Retry rather
    // than endAction starting it again.
    staleRunRef.current = false;
    setLoading(true);
    try {
      await Promise.all([loadStocks(), loadOrCreateSession()]);
    } catch (loadError) {
      setError(errorMessage(loadError, "Could not load the game."));
      throw loadError;
    } finally {
      setLoading(false);
      endAction();
    }
  }, [beginAction, endAction, loadStocks, loadOrCreateSession]);
  reloadSessionRef.current = reloadSession;

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
        .filter((company) => company.isActive && histories.get(company.symbol)?.some(point => point.gameDay === gameDay))
        .map((company) => stockFromCompanyHistory(company, histories.get(company.symbol) ?? []));
    }

    return databaseStocks
      .filter((stock) => stock.is_active && histories.get(stock.symbol)?.some(point => point.gameDay === gameDay))
      .map((stock) => mapStockFromHistory(stock, histories.get(stock.symbol) ?? []));
  }, [databaseStocks, gameDay, gameMode, histories]);

  // News for day D is published after the close on day D, so while the market
  // is open the newest visible day is the previous one.
  const visibleNewsDay = gameDay - (marketPhase === "market_open" ? 1 : 0);

  // The newest published brief: yesterday's while trading (the stories the
  // player is trading on), today's after the close. Testers had to close the
  // market every day just to see any news.
  const news = useMemo(() => newsByDay.get(visibleNewsDay) ?? [], [newsByDay, visibleNewsDay]);

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

  const closeMarket = useCallback(async () => {
    if (!session || !beginAction()) return;
    try {
      const closedDay = gameDayRef.current;
      // Today's news is only readable after the close (BUG-044), so it
      // wasn't in the market loaded while trading was open.
      let todaysNews: MarketNews[] | null = null;
      try {
        // One round trip, and the server starts building tomorrow's market.
        ({ news: todaysNews } = await closeSessionMarket(session.id, closedDay));
      } catch (serverError) {
        // Only an unreachable or older server (no route yet) falls back to
        // closing directly; a refused close is reported as before.
        if (!(serverError instanceof ApiError) || (serverError.status !== null && serverError.status !== 404)) throw serverError;
        const { error } = await supabase.rpc("close_market", {
          target_session_id: session.id, target_game_day: closedDay,
        });
        // Without the RPC the phase is tracked in this browser, as before.
        if (error && !isMissingDbObject(error)) throw error;
        const { data } = await supabase
          .from("session_market_news")
          .select("items")
          .eq("session_id", session.id)
          .eq("game_day", closedDay)
          .maybeSingle();
        todaysNews = (data?.items as MarketNews[] | null) ?? null;
      }
      localStorage.setItem(marketPhaseStorageKey(session.id), `after_hours:${closedDay}`);
      if (todaysNews?.length) {
        setNewsByDay((current) => new Map(current).set(closedDay, withCurrentCopy(todaysNews)));
      }
      setMarketPhase("after_hours");
    } catch (error) { reportError(error); } finally { endAction(); }
  }, [session, beginAction, endAction, reportError]);

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

    if (!beginAction()) return;
    setAdvancing(true);
    try {
      const result = await advanceSessionDay(session.id, next);
      const appliedDay = Number(result.day);
      // The advance is already committed. Keep its day, cash and bill even if
      // a later read fails, so Retry cannot resubmit yesterday's day.
      gameDayRef.current = appliedDay;
      localStorage.setItem(marketPhaseStorageKey(session.id), "market_open");
      const applyAdvance = () => {
        setGameDayState(appliedDay);
        setMarketPhase("market_open");
        setSession((current) => current && ({ ...current, current_day: appliedDay, market_phase: "market_open", cash_balance: result.cash }));
        setAccount((current) => ({
          ...current,
          cash: asNumber(result.cash),
          unpaidBills: asNumber(result.unpaid_bills ?? current.unpaidBills),
        }));
        // Also shown when only carried-over debt was collected.
        if (result.cycles_charged > 0 || asNumber(result.amount_paid) > 0) {
          setLatestBill({
            cycles: result.cycles_charged,
            total: asNumber(result.bill_total),
            paid: asNumber(result.amount_paid),
            shortfall: asNumber(result.shortfall),
            day: appliedDay,
          });
        }
        setTradedToday({});
      };

      // Independent reads: fetched together so the new day appears after one
      // round trip instead of two.
      let market: SessionMarket;
      let refreshed: Awaited<ReturnType<typeof fetchSessionRow>>;
      try {
        [market, refreshed] = await Promise.all([
          fetchSessionMarket(session.id, currentDay + 1),
          fetchSessionRow(session.id),
        ]);
      } catch (readError) {
        applyAdvance();
        throw readError;
      }
      // The new day and its prices land in one render. Setting the day first
      // emptied the market list until the prices arrived, and every row then
      // animated back in, which read as lag.
      applyAdvance();
      setPriceRows((rows) => [...rows.filter((row) => row.game_day <= currentDay), ...market.rows]);
      setNewsByDay((current) => {
        const merged = new Map(Array.from(current).filter(([storedDay]) => storedDay <= currentDay));
        market.news.forEach((items, storedDay) => merged.set(storedDay, items));
        return merged;
      });
      if (refreshed.error) throw refreshed.error;
      setSession(refreshed.data as GameSession);
      setError(null);
    } catch (advanceError) {
      setError(errorMessage(advanceError, "Could not advance the day."));
    } finally {
      endAction();
      setAdvancing(false);
    }
  }, [gameMode, session, beginAction, endAction]);

  const getTradeQuote = useCallback((
    stock: Stock,
    tradeType: "buy" | "sell",
    quantity = 1
  ) => {
    // Price from the live market, not the Stock object the caller captured:
    // a trade dialog left open across a day change held yesterday's price.
    const live = stocks.find((item) => item.symbol === stock.symbol) ?? stock;
    // Same inputs and rounding as execute_trade (BUG-024): net worth before
    // debt, and the total rounded to cents.
    const netWorth = account.cash + getPortfolioValue(account, stocks);
    const prior = tradedToday[`${tradeType}:${live.symbol}`] ?? 0;
    const total = quantity > 0
      ? getCumulativeTradeTotal(live.currentPrice, prior, quantity, netWorth, tradeType)
      : 0;
    const effectivePrice = quantity > 0 ? total / quantity : live.currentPrice;
    const slippage = live.currentPrice > 0 ? (effectivePrice - live.currentPrice) / live.currentPrice : 0;
    return {
      basePrice: live.currentPrice,
      effectivePrice,
      slippage: Math.abs(slippage),
      total,
    };
  }, [account, stocks, tradedToday]);

  const executeTrade = useCallback(async (
    stock: Stock,
    tradeType: "buy" | "sell",
    quantity = 1,
    journal?: TradeJournalInput,
  ) => {
    if (!session || !user || !beginAction()) return false;
    try {
      if (gameMode === "limited_30" && gameDay >= LIMITED_GAME_DAYS) {
        throw new Error("Challenge complete. Start a new run to play.");
      }
      // Another tab changed this run and the reload hasn't happened yet; this
      // action's endAction starts it.
      if (staleRunRef.current) throw new Error("Your game has changed. Reload before trying again.");
      // BUG-060: no trades after the close. SQL c's trade RPCs refuse them on
      // the server; an older schema has no market_phase column and its
      // execute_trade never checks, so the close another tab of this browser
      // recorded is honoured here too.
      const closedElsewhere = session.market_phase === undefined
        && localStorage.getItem(marketPhaseStorageKey(session.id)) === `after_hours:${gameDay}`;
      if (marketPhase === "after_hours" || closedElsewhere) {
        if (closedElsewhere) setMarketPhase("after_hours");
        throw new Error(MARKET_CLOSED_MESSAGE);
      }
      const currentStock = stocks.find((current) => current.symbol === stock.symbol);
      if (!currentStock || !Number.isInteger(quantity) || quantity <= 0) throw new Error("Invalid trade");
      stock = currentStock;
      const key = `${session.id}:${gameDay}:${stock.symbol}:${tradeType}:${quantity}`;
      if (pendingTrade.current?.key !== key) pendingTrade.current = { key, id: crypto.randomUUID() };
      const tradeArgs = {
        target_session_id: session.id,
        target_symbol: stock.symbol,
        target_trade_type: tradeType,
        target_game_day: gameDay,
        target_quantity: quantity,
      };
      let { data, error: tradeError } = await supabase.rpc("execute_trade_checked", {
        ...tradeArgs,
        operation_id: pendingTrade.current.id,
      });
      if (isMissingDbObject(tradeError)) {
        ({ data, error: tradeError } = await supabase.rpc("execute_trade", {
          ...tradeArgs,
          target_price: stock.currentPrice,
        }));
      }
      if (tradeError) throw tradeError;
      pendingTrade.current = null;
      const result = data as TradeResult;
      const volumeKey = `${tradeType}:${stock.symbol}`;
      setTradedToday((current) => ({ ...current, [volumeKey]: (current[volumeKey] ?? 0) + quantity }));

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
          ...current,
          cash: asNumber(result.cash),
          holdings,
        };
      });

      let journalSaved = true;
      if (journal && (journal.thesis.trim() || journal.exitPlan.trim())) {
        journalSaved = await recordTradeJournalEntry({
          sessionId: session.id,
          userId: user.id,
          symbol: stock.symbol,
          tradeType,
          quantity,
          // The legacy execute_trade returns `price`; its oldest versions return
          // neither field and fill at the target_price this call sent.
          executionPrice: Number(result.execution_price ?? result.price ?? stock.currentPrice),
          gameDay,
          journal,
        });
      }

      // The checked trade validates the prepared market. A trade only changes
      // the account, so keep the already loaded prices, news and watchlist.
      try {
        const [holdings, refreshed] = await Promise.all([
          loadHoldings(session.id),
          supabase.from("game_sessions").select(SESSION_COLUMNS).eq("id", session.id).single(),
        ]);
        if (refreshed.error) throw refreshed.error;
        const activeSession = refreshed.data as GameSession;
        if (activeSession.current_day !== gameDayRef.current) throw new Error("Your game has changed. Reload before trying again.");
        setSession(activeSession);
        if (activeSession.market_phase) setMarketPhase(activeSession.market_phase);
        setAccount({ cash: asNumber(activeSession.cash_balance), holdings, unpaidBills: asNumber(activeSession.unpaid_bills) });
      }
      catch (error) {
        console.error("Trade saved, refresh failed", error);
        setError("Your trade was saved. Reload to refresh your account.");
        return true;
      }
      setError(journalSaved ? null : "The trade completed, but its decision journal could not be saved.");
      return true;
    } catch (error) { reportError(error); return false; } finally { endAction(); }
  }, [gameMode, stocks, gameDay, marketPhase, loadHoldings, session, user, beginAction, endAction, reportError]);

  const buyStock = useCallback(
    (stock: Stock, quantity = 1, journal?: TradeJournalInput) => executeTrade(stock, "buy", quantity, journal),
    [executeTrade]
  );

  const sellStock = useCallback(
    (stock: Stock, quantity = 1, journal?: TradeJournalInput) => executeTrade(stock, "sell", quantity, journal),
    [executeTrade]
  );

  const resetAccount = useCallback(async (mode: GameMode = gameMode) => {
    if (!user || !beginAction()) return false;
    const nextMode = normalizeGameMode(mode);

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
      endAction();
      setLoading(false);
    }
  }, [applySession, gameMode, user, beginAction, endAction]);

  const addCash = useCallback(async (amount: number) => {
    if (!session) return false;
    if (!(amount < 0)) {
      setError("Cash is managed by the game server and can't be added directly.");
      return false;
    }

    const { data, error: spendError } = await supabase.rpc("spend_session_cash", {
      target_session_id: session.id,
      p_amount: Number((-amount).toFixed(2)),
    });
    if (spendError) {
      setError(spendError.message);
      return false;
    }

    setAccount((current) => ({ ...current, cash: asNumber(data as number | string) }));
    return true;
  }, [session]);

  const hireAdvisor = useCallback(async (advisorId: string) => {
    if (!session || !beginAction()) return false;
    try {
      await ensureSessionMarket(session.id);
      const { data, error } = await supabase.rpc("hire_advisor", {
        target_session_id: session.id, target_game_day: gameDayRef.current, advisor_id: advisorId,
      });
      if (error && isMissingDbObject(error)) {
        // Older schema: pay through spend_session_cash, record the hire locally.
        const { data: cash, error: spendError } = await supabase.rpc("spend_session_cash", {
          target_session_id: session.id, p_amount: ADVISOR_COST,
        });
        if (spendError) throw spendError;
        const owned = readOwnedAdvisorIds(session.id, gameDayRef.current);
        const stored = JSON.parse(localStorage.getItem(ownershipKey(session.id)) ?? "[]") as unknown[];
        localStorage.setItem(ownershipKey(session.id), JSON.stringify([
          ...stored, { id: advisorId, hiredDay: gameDayRef.current },
        ]));
        setLocalAdvisorIds([...owned, advisorId]);
        setAccount(current => ({ ...current, cash: asNumber(cash as number | string) }));
        return true;
      }
      if (error) throw error;
      setSession(data as GameSession);
      setAccount(current => ({ ...current, cash: Number(data.cash_balance) }));
      return true;
    } catch (error) { reportError(error); return false; } finally { endAction(); }
  }, [session, beginAction, endAction, reportError]);

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

  // Keyed on the id, not the session object: an advance replaces the object
  // twice, and each new identity re-ran every caller's sync and leaderboard read.
  const syncSessionValue = useCallback(async () => {
    if (!activeSessionId || loading) return;
    try {
      await syncGameState(activeSessionId);
    } catch (syncError) {
      setError(errorMessage(syncError, "Could not sync session value."));
    }
  }, [loading, activeSessionId]);

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
    addCash,
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
    advisorIds: session?.advisor_ids ?? localAdvisorIds,
    // claim_achievements checks every unlock on the server, so any loaded
    // run may claim. `ranked` only decides the leaderboards.
    verifiedRun: Boolean(session),
    ranked: session?.ranked ?? null,
    cashStreak: session?.cash_discipline_streak ?? 0,
    gainStreak: session?.hot_streak_days ?? 0,
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
    reloadSession,
    syncSessionValue,
    tradedToday,
  }), [actionPending, hireAdvisor, localAdvisorIds, tradedToday,
    account, addCash, addToWatchlist, advancing, buyStock, closeMarket, error, gameDay, gameMode, getHistory,
    getRelatedNews, getStock, getTradeQuote, loading, reloadSession, news, newsHistory, resetAccount,
    sellStock, marketSeed, setGameDay, session, stocks, storyArcs, syncSessionValue,
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
