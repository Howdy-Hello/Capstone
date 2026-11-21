import { Stock, StockPriceHistory } from "./mockStocks";

export const MARKET_CHART_DAYS = 20;

type SessionCandle = Pick<StockPriceHistory, "gameDay" | "openPrice" | "highPrice" | "lowPrice" | "closePrice">;
type GetHistory = (symbol: string) => readonly SessionCandle[];

export function buildMarketHistory(
  stocks: readonly Pick<Stock, "symbol">[],
  getHistory: GetHistory,
  gameDay: number,
) {
  const firstDay = Math.max(1, gameDay - MARKET_CHART_DAYS + 1);
  const byDay = new Map<number, SessionCandle[]>();

  for (const { symbol } of stocks) {
    const history = getHistory(symbol);
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const point = history[i];
      if (point.gameDay < firstDay) break;
      if (point.gameDay > gameDay || point.openPrice <= 0) continue;
      const day = byDay.get(point.gameDay) ?? [];
      day.push(point);
      byDay.set(point.gameDay, day);
    }
  }

  // Start at 100 and compound each day's equally weighted return. Averaging
  // relative highs and lows estimates the range from the available daily data.
  let index = 100;
  return [...byDay.entries()].sort(([a], [b]) => a - b).map(([day, prices]) => {
    const openPrice = index;
    const averageAt = (field: "highPrice" | "lowPrice" | "closePrice") => (
      openPrice * prices.reduce((total, price) => total + price[field] / price.openPrice, 0) / prices.length
    );

    index = averageAt("closePrice");
    return {
      gameDay: day,
      openPrice,
      highPrice: averageAt("highPrice"),
      lowPrice: averageAt("lowPrice"),
      closePrice: index,
    };
  });
}
