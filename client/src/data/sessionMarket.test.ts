import { getCompanyBySymbol, getStockBySymbolForGameDay, mockStockCompanies } from "./mockStocks";
import { generateSessionPrices, historyFromRows, sanitizeNews, stockFromCompanyHistory, generateSessionNews } from "./sessionMarket";

const SEED = "TEST42";
const EMPTY_SCRIPT = { stocks: [], prices: [], events: [] };

test("limited_30 stocks rebuilt from stored rows match the generator", () => {
  const rows = generateSessionPrices({ mode: "limited_30", seed: SEED, fromDay: 1, toDay: 12, script: EMPTY_SCRIPT });

  for (const company of mockStockCompanies.filter((item) => item.isActive)) {
    const history = historyFromRows(rows.filter((row) => row.symbol === company.symbol));
    const fromRows = stockFromCompanyHistory(getCompanyBySymbol(company.symbol)!, history);
    const generated = getStockBySymbolForGameDay(company.symbol, 12, SEED)!;
    expect(fromRows.currentPrice).toBe(generated.currentPrice);
    expect(fromRows.previousPrice).toBe(generated.previousPrice);
    expect(fromRows.dayChangePercent).toBe(generated.dayChangePercent);
  }
});

test("stored news never carries the next session's exact impact", () => {
  const news = generateSessionNews({ mode: "limited_30", seed: SEED, day: 2, script: EMPTY_SCRIPT }).map(sanitizeNews);
  expect(news.length).toBeGreaterThan(0);
  for (const item of news) {
    expect(item.impactByTicker).toBeUndefined();
    expect(item.actualImpact).toBe(0);
    expect(item.isAccurate).toBe(true);
  }
});
