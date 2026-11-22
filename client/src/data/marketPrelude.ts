import { MarketNews, seededRange } from "./mockStocks";
import { SessionPriceRow } from "./sessionMarket";

export const MARKET_PRELUDE_DAYS = 15;
export const FIRST_MARKET_DAY = 1 - MARKET_PRELUDE_DAYS;

export function formatMarketDay(day: number) {
  return day < 1 ? `−${1 - day}d` : `Day ${day}`;
}

/** Background history only; never runs the trading, billing or story engines. */
export function buildMarketPrelude(openings: readonly SessionPriceRow[], seed: string) {
  const prices: SessionPriceRow[] = [];
  const news: MarketNews[] = [];
  const cents = (value: number) => Math.max(0.01, Number(value.toFixed(2)));

  for (const opening of openings) {
    if (opening.game_day !== 1 || !Number.isFinite(Number(opening.open_price)) || Number(opening.open_price) <= 0) continue;
    const { symbol } = opening;
    const volatility = seededRange(`prelude-volatility-${symbol}`, 0.012, 0.035, seed);
    let close = Number(opening.open_price);

    // Work backwards so the last historical close equals the stored Day 1 open.
    for (let day = 0; day >= FIRST_MARKET_DAY; day -= 1) {
      const key = `prelude-${symbol}-${day}`;
      const move = seededRange(`prelude-market-${day}`, -0.006, 0.006, seed)
        + seededRange(`${key}-move`, -volatility, volatility, seed);
      const open = cents(close / (1 + move));
      const wick = seededRange(`${key}-wick`, 0.002, volatility / 2, seed);
      prices.push({
        game_day: day,
        symbol,
        open_price: open,
        high_price: cents(Math.max(open, close) * (1 + wick)),
        low_price: cents(Math.min(open, close) * (1 - wick)),
        close_price: close,
        volume: Math.max(1, Math.round(Number(opening.volume) * seededRange(`${key}-volume`, 0.6, 1.4, seed))),
        event_impact: 0,
      });
      close = open;
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

  return { prices, news };
}
