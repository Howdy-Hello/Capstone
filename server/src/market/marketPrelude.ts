// GENERATED from client/src/data/marketPrelude.ts by scripts/sync-market-engine.cjs.
// Do not edit here -- edit the client file and re-run the script.
import { MarketNews, seededRange, StockCompany } from "./mockStocks";
import type { SessionPriceRow } from "./sessionMarket";

export const MARKET_PRELUDE_DAYS = 15;
export const FIRST_MARKET_DAY = 1 - MARKET_PRELUDE_DAYS;

const calendarDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
export const DEFAULT_MARKET_START_DATE = new Date().toISOString();

export function formatMarketDay(day: number, startDate = DEFAULT_MARKET_START_DATE) {
  const date = new Date(`${startDate.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + day - 1);
  return calendarDate.format(date);
}

/** Simulates market history and the opening session without player progression or story arcs. */
export function buildMarketPrelude(stocks: readonly Pick<StockCompany, "symbol" | "startingPrice" | "volatility" | "riskLevel">[], seed: string, engine = 4) {
  const prices: SessionPriceRow[] = [];
  const firstDayPrices: SessionPriceRow[] = [];
  const news: MarketNews[] = [];
  const cents = (value: number) => Math.max(0.01, Number(value.toFixed(2)));

  for (const stock of stocks) {
    if (!Number.isFinite(stock.startingPrice) || stock.startingPrice <= 0) continue;
    const { symbol, volatility } = stock;
    const baseVolume = stock.riskLevel === "High" ? 1_200_000 : stock.riskLevel === "Medium" ? 850_000 : 600_000;
    let open = stock.startingPrice;

    for (let day = FIRST_MARKET_DAY; day <= (engine >= 4 ? 1 : 0); day += 1) {
      const key = `prelude-${symbol}-${day}`;
      const activity = engine >= 4 ? seededRange(`prelude-activity-${day}`, 0.3, 1.7, seed) : 1;
      const marketRange = engine >= 4 ? 0.014 : 0.006;
      const move = seededRange(`prelude-market-${day}`, -marketRange, marketRange, seed) * activity
        + seededRange(`${key}-move`, -volatility, volatility, seed) * activity;
      const close = cents(open * (1 + move));
      // Engine 3 keeps its original series so ongoing runs never change price levels.
      const wick = seededRange(`${key}-wick`, 0.002, volatility / 2, seed);
      const upperWick = engine >= 4
        ? seededRange(`${key}-upper`, 0, volatility / 2, seed) * activity * seededRange(`prelude-upper-${day}`, 0.1, 1.6, seed)
        : wick;
      const lowerWick = engine >= 4
        ? seededRange(`${key}-lower`, 0, volatility / 2, seed) * activity * seededRange(`prelude-lower-${day}`, 0.1, 1.6, seed)
        : wick;
      (day === 1 ? firstDayPrices : prices).push({
        game_day: day,
        symbol,
        open_price: open,
        high_price: cents(Math.max(open, close) * (1 + upperWick)),
        low_price: cents(Math.min(open, close) * (1 - lowerWick)),
        close_price: close,
        volume: Math.round(baseVolume * seededRange(`${key}-volume`, 0.6, 1.4, seed) * activity),
        event_impact: 0,
      });
      open = close;
    }
  }

  // Three standalone recaps give context without inventing unfinished stories.
  for (const day of [0, -5, -10]) {
    const movers = prices.filter((point) => point.game_day === day);
    if (!movers.length) continue;
    const point = movers.reduce((best, item) => (
      Math.abs(item.close_price / item.open_price - 1) > Math.abs(best.close_price / best.open_price - 1) ? item : best
    ));
    const change = (point.close_price / point.open_price - 1) * 100;
    const direction = change >= 0 ? "up" : "down";
    news.push({
      newsId: `prelude_${point.symbol}_${day}`,
      gameDay: day,
      source: "Market Desk",
      headline: `${point.symbol} closes ${direction} ${Math.abs(change).toFixed(1)}%`,
      body: `${point.symbol} finished the session at $${point.close_price.toFixed(2)}, ${direction} from its $${point.open_price.toFixed(2)} open. It was one of the day's larger percentage moves, trading between $${point.low_price.toFixed(2)} and $${point.high_price.toFixed(2)}.`,
      importance: "Low",
      marketTone: "Unclear",
      relatedTickers: [point.symbol],
      expectedImpact: 0,
      actualImpact: 0,
      isAccurate: true,
      isRumor: false,
      category: "operations",
      confidence: "High",
    });
  }

  return { prices, news, firstDayPrices };
}
