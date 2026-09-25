// Per-run market data, as the API server generates and stores it
// (session_stock_prices / session_market_news) and the client reads it back.
//
// Pure and shared with the server -- server/src/market/ holds a copy. Run
// `node scripts/sync-market-engine.cjs` after editing this file.
import {
  asNumber,
  DatabaseEvent,
  DatabasePrice,
  DatabaseStock,
  generateContinuationPricePoint,
  getHistoryForDatabaseStock,
  getSeededInfiniteNews,
  getScriptedHistory,
  mapDatabaseEvent,
} from "./infiniteMarket";
import {
  getNewsForGameDay,
  getStockHistoryBySymbol,
  MarketNews,
  mockStockCompanies,
  Stock,
  StockCompany,
  StockPriceHistory,
} from "./mockStocks";

export type SessionGameMode = "infinite" | "limited_30";

export const LIMITED_RUN_DAYS = 30;
export const MAX_RUN_DAY = 10_000;

/** One row of public.session_stock_prices. */
export type SessionPriceRow = {
  game_day: number;
  symbol: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  event_impact: number;
};

/** The shared infinite-mode script, read once from the database. */
export type MarketScript = {
  stocks: DatabaseStock[];
  prices: DatabasePrice[];
  events: DatabaseEvent[];
};

/** First infinite day whose news is seeded rather than scripted. */
export function firstSeededNewsDay(script: MarketScript) {
  return script.events.reduce((latest, event) => Math.max(latest, event.game_day), 0) + 1;
}

export function clampRunDay(day: number, mode: SessionGameMode) {
  const whole = Number.isFinite(day) ? Math.floor(day) : 1;
  return Math.max(1, Math.min(mode === "limited_30" ? LIMITED_RUN_DAYS : MAX_RUN_DAY, whole));
}

function toRow(point: StockPriceHistory): SessionPriceRow {
  return {
    game_day: point.gameDay,
    symbol: point.symbol,
    open_price: point.openPrice,
    high_price: point.highPrice,
    low_price: point.lowPrice,
    close_price: point.closePrice,
    volume: Math.round(point.volume),
    event_impact: Number(point.eventImpact.toFixed(6)),
  };
}

/**
 * Price rows for days fromDay..toDay (inclusive) of one run.
 *
 * `previousCloses` are the stored closes for fromDay - 1. Infinite runs chain
 * each day off the previous close, so continuing from what is *stored* keeps a
 * run's history intact even if the generator changes later.
 */
export function generateSessionPrices(params: {
  mode: SessionGameMode;
  seed: string;
  fromDay: number;
  toDay: number;
  script: MarketScript;
  previousCloses?: Record<string, number>;
}): SessionPriceRow[] {
  const { mode, seed, fromDay, toDay, script, previousCloses = {} } = params;
  if (toDay < fromDay) return [];
  const rows: SessionPriceRow[] = [];

  if (mode === "limited_30") {
    for (const company of mockStockCompanies.filter((item) => item.isActive)) {
      for (const point of getStockHistoryBySymbol(company.symbol, toDay, seed)) {
        if (point.gameDay >= fromDay) rows.push(toRow(point));
      }
    }
    return rows;
  }

  const seededNewsFrom = firstSeededNewsDay(script);
  for (const stock of script.stocks.filter((item) => item.is_active)) {
    const scripted = getScriptedHistory(stock, script.prices);
    const lastScriptedDay = scripted[scripted.length - 1]?.gameDay ?? 0;
    let previousClose: number | undefined = previousCloses[stock.symbol];

    for (let day = fromDay; day <= toDay; day += 1) {
      let point = day <= lastScriptedDay
        ? scripted.find((item) => item.gameDay === day)
        : undefined;

      if (!point) {
        if (previousClose === undefined) {
          // Nothing stored for the previous day: rebuild it from the script.
          const rebuilt = getHistoryForDatabaseStock(stock, script.prices, day - 1, seed, seededNewsFrom);
          previousClose = rebuilt[rebuilt.length - 1]?.closePrice ?? asNumber(stock.initial_price);
        }
        point = generateContinuationPricePoint(stock, previousClose, day, seed, seededNewsFrom);
      }

      rows.push(toRow(point));
      previousClose = point.closePrice;
    }
  }

  return rows;
}

/** Every story published after the close on `day` (full detail -- server only). */
export function generateSessionNews(params: {
  mode: SessionGameMode;
  seed: string;
  day: number;
  script: MarketScript;
}): MarketNews[] {
  const { mode, seed, day, script } = params;
  if (mode === "limited_30") return getNewsForGameDay(day, seed);

  const seededNewsFrom = firstSeededNewsDay(script);
  if (day < seededNewsFrom) {
    return script.events.filter((event) => event.game_day === day).map(mapDatabaseEvent);
  }
  return getSeededInfiniteNews(day, seed, seededNewsFrom);
}

/**
 * What a player may see of a story. The exact impacts decide the next
 * session's move and isAccurate says whether a rumor is true, so neither may
 * reach the browser before the market has moved.
 */
export function sanitizeNews(news: MarketNews): MarketNews {
  const visible: MarketNews = { ...news, expectedImpact: 0, actualImpact: 0, isAccurate: true };
  delete visible.impactByTicker;
  return visible;
}

export function historyFromRows(rows: SessionPriceRow[]): StockPriceHistory[] {
  return [...rows]
    .sort((a, b) => a.game_day - b.game_day)
    .map((row) => {
      const openPrice = asNumber(row.open_price);
      const closePrice = asNumber(row.close_price);
      const change = closePrice - openPrice;
      return {
        priceId: `session_${row.symbol.toLowerCase()}_${row.game_day}`,
        stockId: row.symbol,
        symbol: row.symbol,
        gameDay: row.game_day,
        openPrice,
        highPrice: asNumber(row.high_price),
        lowPrice: asNumber(row.low_price),
        closePrice,
        volume: asNumber(row.volume),
        change: Number(change.toFixed(2)),
        changePercent: openPrice > 0 ? Number(((change / openPrice) * 100).toFixed(2)) : 0,
        eventImpact: asNumber(row.event_impact),
      };
    });
}

/** A limited_30 stock (catalog metadata) priced from stored history. */
export function stockFromCompanyHistory(company: StockCompany, history: StockPriceHistory[]): Stock {
  const today = history[history.length - 1];
  const yesterday = history[history.length - 2];
  const previousPrice = yesterday?.closePrice ?? company.startingPrice;
  const currentPrice = today?.closePrice ?? company.startingPrice;
  const dayChange = currentPrice - previousPrice;

  return {
    ...company,
    currentPrice: Number(currentPrice.toFixed(2)),
    previousPrice: Number(previousPrice.toFixed(2)),
    dayChange: Number(dayChange.toFixed(2)),
    dayChangePercent: previousPrice > 0 ? Number(((dayChange / previousPrice) * 100).toFixed(2)) : 0,
    volume: today?.volume ?? 0,
    eventImpact: today?.eventImpact ?? 0,
  };
}
