import { getNewsForGameDay } from './mockStocks';
import { DatabaseStock, getHistoryForDatabaseStock } from './databaseMarket';
import { makePalette } from '../context/ThemeContext';

test('infinite continuation sums overlapping news for the same stock and day', () => {
  const stock = { id: 1, symbol: 'GVE', initial_price: 100, current_price: 100,
    sector: 'Energy', volatility: 0.02, trend_bias: 0, risk_level: 'Medium' } as DatabaseStock;
  const impacts = getNewsForGameDay(35, 'STOCKPILOT').filter(n => n.relatedTickers.includes('GVE'))
    .map(n => n.impactByTicker?.GVE?.actualImpact ?? n.actualImpact ?? 0);
  expect(impacts.length).toBeGreaterThan(1);
  const history = getHistoryForDatabaseStock(stock, [], 36, 'STOCKPILOT');
  expect(history[history.length - 1].eventImpact).toBe(Number(impacts.reduce((a,b) => a+b,0).toFixed(2)));
});

test('white custom surfaces receive dark text when applied or restored', () => {
  const input = { bg: '#ffffff', surface: '#ffffff', elevated: '#f8fafc', brand: '#5865f2' };
  expect(makePalette(input).t1).toBe('#0F172A');
  expect(makePalette(JSON.parse(JSON.stringify(input))).t1).toBe('#0F172A');
  expect(makePalette({ ...input, bg: '#111111' }).t1).not.toBe('#0F172A');
});
