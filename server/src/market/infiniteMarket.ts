// GENERATED from client/src/data/infiniteMarket.ts by scripts/sync-market-engine.cjs.
// Do not edit here -- edit the client file and re-run the script.
// Infinite-mode market engine: the shared 30-day database script plus the
// seeded continuation that extends it forever.
//
// Pure (no React, no Supabase) because it runs in two places: the API server
// generates and stores each run's prices with it, and the client uses its row
// types and stock builder. server/src/market/ holds a copy -- run
// `node scripts/sync-market-engine.cjs` after editing this file.
import {
  enrichMarketNews,
  getNewsForGameDay,
  hashString,
  MarketNews,
  normalizeGameDay,
  seededRange,
  Stock,
  StockPriceHistory,
} from "./mockStocks";

export type DatabaseStock = {
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

export type DatabaseEventImpact = {
  expected_impact: number | string;
  actual_impact: number | string;
  stocks: { symbol: string } | { symbol: string }[] | null;
};

export type DatabaseEvent = {
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

export type DatabasePrice = {
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

export function asNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

export function relatedSymbol(
  relation: { symbol: string } | { symbol: string }[] | null
) {
  if (Array.isArray(relation)) return relation[0]?.symbol;
  return relation?.symbol;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

// market_events has no tone column, so tone is derived the same way the seeded
// market data pairs them: the sign of the *expected* impact. Deriving from the
// actual impact instead would leak how rumors and inaccurate reports resolve.
function toneFromImpact(expectedImpact: number): MarketNews["marketTone"] {
  if (expectedImpact > 0) return "Bullish";
  if (expectedImpact < 0) return "Bearish";
  return "Unclear";
}

export function mapDatabaseEvent(row: DatabaseEvent): MarketNews {
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

/**
 * Seeded news for an infinite day past the database script.
 *
 * Follow-up stories refer to the previous day's seeded reports, but on the
 * first seeded day the player saw the *scripted* reports instead, so those
 * follow-ups would describe stories that never ran. They are dropped.
 */
export function getSeededInfiniteNews(day: number, marketSeed: string, firstSeededNewsDay?: number) {
  const news = getNewsForGameDay(day, marketSeed);
  return day === firstSeededNewsDay ? news.filter((item) => !item.followUpTo) : news;
}

// getNewsForGameDay builds the whole market's feed (~5ms). The continuation
// asks once per stock per generated day, so without this cache generating 100
// days for 20 stocks took ~15s. Output is deterministic per (seed, day), so
// caching the per-ticker impacts is safe.
const seededImpactCache = new Map<string, Map<string, number>>();
const SEEDED_IMPACT_CACHE_LIMIT = 5_000;

function seededEventImpact(
  symbol: string,
  gameDay: number,
  marketSeed: string,
  firstSeededNewsDay?: number
) {
  if (gameDay < 1) return 0;
  const key = `${marketSeed}:${gameDay}:${gameDay === firstSeededNewsDay ? "first" : "rest"}`;
  let impacts = seededImpactCache.get(key);
  if (!impacts) {
    // Mirrors mockStocks' getEventImpact (limited_30): every story-arc event
    // and follow-up counts, other stories count once per ticker.
    impacts = new Map();
    const primarySeen = new Set<string>();
    for (const event of getSeededInfiniteNews(gameDay, marketSeed, firstSeededNewsDay)) {
      const alwaysCounts = Boolean(event.followUpTo) || Boolean(event.arcKey);
      for (const ticker of event.relatedTickers) {
        const impact = event.impactByTicker?.[ticker]?.actualImpact ?? event.actualImpact ?? 0;
        if (!alwaysCounts) {
          if (primarySeen.has(ticker)) continue;
          primarySeen.add(ticker);
        }
        impacts.set(ticker, (impacts.get(ticker) ?? 0) + impact);
      }
    }
    if (seededImpactCache.size >= SEEDED_IMPACT_CACHE_LIMIT) seededImpactCache.clear();
    seededImpactCache.set(key, impacts);
  }
  return impacts.get(symbol) ?? 0;
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

export function generateContinuationPricePoint(
  stock: DatabaseStock,
  previousClose: number,
  gameDay: number,
  marketSeed: string,
  firstSeededNewsDay?: number
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
  const eventImpact = seededEventImpact(symbol, gameDay - 1, marketSeed, firstSeededNewsDay);
  const dailyReturn = clamp(
    marketDrift + sectorDrift + trendBias + meanReversion + randomShock + eventImpact,
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
    eventImpact: round2(eventImpact),
  };
}

/**
 * The shared database script as a run sees it: news is published after the
 * close and moves the *next* session, so stored day N becomes day N + 1, and
 * day 1 is a flat point at the listing price.
 */
export function getScriptedHistory(stock: DatabaseStock, prices: DatabasePrice[]) {
  const scripted = prices
    .filter((price) => relatedSymbol(price.stocks) === stock.symbol)
    .map((price) => mapDatabasePrice(price, stock.symbol))
    .map((price) => ({ ...price, priceId: `${price.priceId}_delayed`, gameDay: price.gameDay + 1 }))
    .sort((a, b) => a.gameDay - b.gameDay);

  scripted.unshift({
    priceId: `initial_${stock.symbol.toLowerCase()}_1`,
    stockId: stock.symbol,
    symbol: stock.symbol,
    gameDay: 1,
    openPrice: asNumber(stock.initial_price),
    highPrice: asNumber(stock.initial_price),
    lowPrice: asNumber(stock.initial_price),
    closePrice: asNumber(stock.initial_price),
    volume: 0,
    change: 0,
    changePercent: 0,
    eventImpact: 0,
  });

  return scripted;
}

export function getHistoryForDatabaseStock(
  stock: DatabaseStock,
  prices: DatabasePrice[],
  throughDay: number,
  marketSeed: string,
  firstSeededNewsDay?: number
) {
  const storedHistory = getScriptedHistory(stock, prices);
  const safeGameDay = normalizeGameDay(throughDay);
  const visibleHistory = storedHistory.filter((price) => price.gameDay <= safeGameDay);
  const lastStoredPoint = storedHistory[storedHistory.length - 1];

  if (!lastStoredPoint || safeGameDay <= lastStoredPoint.gameDay) {
    return visibleHistory;
  }

  const generatedHistory = [...visibleHistory];
  let previousClose = lastStoredPoint.closePrice;

  for (let day = lastStoredPoint.gameDay + 1; day <= safeGameDay; day += 1) {
    const point = generateContinuationPricePoint(stock, previousClose, day, marketSeed, firstSeededNewsDay);
    generatedHistory.push(point);
    previousClose = point.closePrice;
  }

  return generatedHistory;
}

export function mapStockFromHistory(row: DatabaseStock, history: StockPriceHistory[]): Stock {
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
