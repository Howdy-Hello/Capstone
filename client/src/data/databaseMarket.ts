import { getNewsForGameDay, hashString, normalizeGameDay, seededRange, Stock, StockPriceHistory } from "./mockStocks";
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

function asNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function relatedSymbol(
  relation: { symbol: string } | { symbol: string }[] | null
) {
  if (Array.isArray(relation)) return relation[0]?.symbol;
  return relation?.symbol;
}

// getNewsForGameDay builds the whole market's feed (~5ms). The continuation
// loop asks once per stock per generated day, and every gameDay change
// regenerates all of it, so without this cache a run 100 days past the stored
// prices froze the tab for ~15s per advance. Output is deterministic per
// (seed, day), so caching the per-ticker impacts is safe.
const seededImpactCache = new Map<string, Map<string, number>>();
const SEEDED_IMPACT_CACHE_LIMIT = 5_000;

function seededEventImpact(symbol: string, gameDay: number, marketSeed: string) {
  if (gameDay < 1) return 0;
  const key = `${marketSeed}:${gameDay}`;
  let impacts = seededImpactCache.get(key);
  if (!impacts) {
    impacts = new Map();
    for (const event of getNewsForGameDay(gameDay, marketSeed)) {
      for (const ticker of event.relatedTickers) {
        impacts.set(ticker, (impacts.get(ticker) ?? 0) + (event.impactByTicker?.[ticker]?.actualImpact ?? event.actualImpact ?? 0));
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function round2(value: number) {
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
  const eventImpact = seededEventImpact(symbol, gameDay - 1, marketSeed);
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

export function getHistoryForDatabaseStock(
  stock: DatabaseStock,
  prices: DatabasePrice[],
  throughDay: number,
  marketSeed: string
) {
  const storedHistory = prices
    .filter((price) => relatedSymbol(price.stocks) === stock.symbol)
    .map((price) => mapDatabasePrice(price, stock.symbol))
    .map((price) => ({ ...price, priceId: `${price.priceId}_delayed`, gameDay: price.gameDay + 1 }))
    .sort((a, b) => a.gameDay - b.gameDay);

  storedHistory.unshift({
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

