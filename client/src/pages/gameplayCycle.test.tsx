/* eslint-disable testing-library/no-unnecessary-act */
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import Game from './Game';
import News from './News';
import { getNewsForGameDay, getStockHistoryBySymbol, getStocksForGameDay } from '../data/mockStocks';

let mockPhase = 'market_open';
let mockNews = getNewsForGameDay(2, 'STOCKPILOT').slice(0, 1);
const mockStocks = getStocksForGameDay(2, 'STOCKPILOT');
const mockStock = mockStocks[0];
let mockMarketStocks = [mockStock];
let mockSearchParams = new URLSearchParams();
let mockWatchlist: typeof mockStocks = [];
const mockGetHistory = (symbol: string) => getStockHistoryBySymbol(symbol, 2, 'STOCKPILOT');
const mockYesterday = { ...getNewsForGameDay(1, 'STOCKPILOT')[0], relatedTickers: [mockStock.symbol] };
const mockClose = jest.fn().mockResolvedValue(undefined);
const mockAdvance = jest.fn().mockResolvedValue(undefined);
const mockSync = jest.fn().mockResolvedValue(undefined);
const mockTrading = () => ({
  sessionId: 'run', gameDay: 2, gameMode: 'limited_30', maxGameDay: 30,
  marketPhase: mockPhase, isGameComplete: false, loading: false, verifiedRun: true,
  account: { cash: 1900, holdings: [{ symbol: mockStock.symbol, shares: 1, averageCost: 100 }] },
  stocks: mockMarketStocks, news: mockNews, newsHistory: [...mockNews, mockYesterday],
  tradedToday: {}, watchlistStocks: mockWatchlist, isWatchlisted: () => false,
  getHistory: mockGetHistory,
  closeMarket: mockClose, setGameDay: mockAdvance, syncSessionValue: mockSync,
});

jest.mock('recharts', () => {
  const { cloneElement } = jest.requireActual<typeof import('react')>('react');
  return {
    ...jest.requireActual('recharts'),
    ResponsiveContainer: ({ children }: { children: import('react').ReactElement<{ width: number; height: number }> }) => (
      cloneElement(children, { width: 180, height: 68 })
    ),
  };
});
jest.mock('react-router-dom', () => {
  const React = require('react');
  return {
    Link: React.forwardRef(({ to, ...props }: any, ref: any) => <a href={to} ref={ref} {...props} />),
    useNavigate: () => jest.fn(), useSearchParams: () => [mockSearchParams, jest.fn()],
  };
}, { virtual: true });
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('../context/GameContext', () => ({
  useGame: () => mockTrading(), STARTING_CASH: 2000, WEEKLY_BILL_TOTAL: 100,
  MARKET_CLOSED_MESSAGE: 'The market is closed. Advance to the next day to trade.',
}));
jest.mock('../hooks/useAchievements', () => ({ useAchievements: () => ({ achievementIds: [] }) }));
jest.mock('../hooks/useDailyGoals', () => ({ useDailyGoals: () => ({ goals: [] }) }));
jest.mock('../hooks/useMissions', () => ({ useMissions: jest.fn() }));
jest.mock('../hooks/useStockAlerts', () => ({ useStockAlerts: jest.fn() }));
jest.mock('../hooks/useLevel', () => ({ useLevel: jest.fn() }));
jest.mock('../hooks/useRivalTrader', () => ({ useRivalTrader: () => ({ equityCurve: [] }) }));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mockPhase = 'market_open';
  mockWatchlist = [];
  mockMarketStocks = [mockStock];
  mockSearchParams = new URLSearchParams();
  mockNews = getNewsForGameDay(2, 'STOCKPILOT').slice(0, 1);
  mockClose.mockReset().mockResolvedValue(undefined);
  mockAdvance.mockReset().mockResolvedValue(undefined);
  mockSync.mockReset().mockResolvedValue(undefined);
  localStorage.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

test.each(['market_open', 'after_hours'])('%s shows today articles with the correct trade and transition controls', async (phase) => {
  mockPhase = phase;
  await act(async () => { root.render(<Game />); });
  const brief = container.querySelector('[aria-label="Today\'s news"]')!;
  expect(brief.textContent).toContain(mockNews[0].headline);
  expect(brief.textContent).toContain('Day 2');
  const trades = Array.from(container.querySelectorAll('button')).filter((button) => ['Buy', 'Sell'].includes(button.textContent ?? ''));
  expect(trades).toHaveLength(2);
  expect(trades.every((button) => button.disabled === (phase === 'after_hours'))).toBe(true);
  const next = container.querySelector<HTMLButtonElement>('[data-tour="next-day"]')!;
  expect(next.textContent).toBe(phase === 'market_open' ? 'Close Market' : 'Advance to Next Day');
  if (phase === 'market_open') {
    const recap = container.querySelector('[aria-label="Day 2 recap"]')!;
    expect(recap.textContent).toContain(mockYesterday.headline);
    expect(recap.textContent).not.toContain(mockNews[0].headline);
  }
  await act(async () => { next.click(); });
  expect(mockClose).toHaveBeenCalledTimes(phase === 'market_open' ? 1 : 0);
  expect(mockAdvance).toHaveBeenCalledTimes(phase === 'after_hours' ? 1 : 0);
});

test.each(['market_open', 'after_hours'])('News defaults to today articles during %s', async (phase) => {
  mockPhase = phase;
  await act(async () => { root.render(<News />); });
  expect(container.textContent).toContain(mockNews[0].headline);
  expect(container.textContent).not.toContain(mockYesterday.headline);
  expect(container.textContent).toContain('Day 2 news');
});

test('a quiet news day does not tell players to close the market to see articles', async () => {
  mockNews = [];
  await act(async () => { root.render(<News />); });
  expect(container.textContent).toContain('No major news today.');
  expect(container.textContent).not.toContain('Close the market to receive');
});

test('Game shows the market candles and the first three saved stocks with closing-price charts', async () => {
  mockWatchlist = mockStocks.slice(1, 5).reverse();
  await act(async () => { root.render(<Game />); });

  const marketChart = container.querySelector('[aria-label^="Equal-weight market candlesticks"]');
  expect(marketChart?.querySelectorAll('.recharts-bar-rectangle rect')).toHaveLength(2);

  const watchlist = container.querySelector('[aria-labelledby="game-watchlist"]');
  expect(watchlist?.querySelector('a[aria-label="View full watchlist"]')?.getAttribute('href')).toBe('/game/watchlist');
  expect(Array.from(watchlist?.querySelectorAll('a[href^="/stocks/"]') ?? [], (row) => row.getAttribute('href')))
    .toEqual(mockWatchlist.slice(0, 3).map((stock) => `/stocks/${stock.symbol}`));
  expect(watchlist?.querySelectorAll('.recharts-line-curve')).toHaveLength(3);
});

const sortableStocks: typeof mockStocks = [
  { ...mockStocks[1], currentPrice: 10, dayChangePercent: 4, sector: 'Finance', riskLevel: 'Medium' },
  { ...mockStocks[2], currentPrice: 50, dayChangePercent: -5, sector: 'Technology', riskLevel: 'Low' },
  { ...mockStock, currentPrice: 30, dayChangePercent: -1, sector: 'Finance', riskLevel: 'High' },
  { ...mockStocks[3], currentPrice: 20, dayChangePercent: 1, sector: 'Technology', riskLevel: 'Low' },
  { ...mockStocks[4], currentPrice: 40, dayChangePercent: 0, sector: 'Finance', riskLevel: 'Medium' },
];

async function chooseStockSort(label: string) {
  const button = container.querySelector<HTMLButtonElement>('#stock-sort-button')!;
  jest.spyOn(button, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, top: 0, left: 0, right: 120, bottom: 40, width: 120, height: 40, toJSON: () => ({}),
  });
  await act(async () => { button.click(); });
  const option = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((item) => item.textContent === label)!;
  expect(option).toBeDefined();
  await act(async () => { option.click(); });
}

function marketStockOrder() {
  return Array.from(container.querySelectorAll('[data-tour="market-list"] button[aria-label^="Open "]'), (button) => button.getAttribute('aria-label'));
}

test.each([
  ['Price: high to low', [1, 4, 2, 3, 0]],
  ['Price: low to high', [0, 3, 2, 4, 1]],
  ['Daily increase %: high to low', [0, 3, 1, 2, 4]],
  ['Daily increase %: low to high', [3, 0, 1, 2, 4]],
  ['Daily decrease %: high to low', [1, 2, 0, 3, 4]],
  ['Daily decrease %: low to high', [2, 1, 0, 3, 4]],
  ['Risk: high to low', [2, 0, 4, 1, 3]],
  ['Risk: low to high', [1, 3, 0, 4, 2]],
  ['Owned first', [2, 0, 1, 3, 4]],
] as const)('%s sorts stocks without changing the shared market order', async (label, order) => {
  mockMarketStocks = [...sortableStocks];
  await act(async () => { root.render(<Game />); });
  await chooseStockSort(label);
  expect(marketStockOrder()).toEqual(order.map((index) => `Open ${sortableStocks[index].name}`));
  expect(mockMarketStocks).toEqual(sortableStocks);
});

test('sorting respects the sector filter and can return to the default order', async () => {
  mockMarketStocks = [...sortableStocks];
  mockSearchParams = new URLSearchParams({ sector: 'Finance' });
  await act(async () => { root.render(<Game />); });
  await chooseStockSort('Price: high to low');
  expect(marketStockOrder()).toEqual([4, 2, 0].map((index) => `Open ${sortableStocks[index].name}`));
  await chooseStockSort('Default order');
  expect(marketStockOrder()).toEqual([0, 2, 4].map((index) => `Open ${sortableStocks[index].name}`));
});
