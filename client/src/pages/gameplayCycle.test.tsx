/* eslint-disable testing-library/no-unnecessary-act */
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import Game from './Game';
import News from './News';
import { getNewsForGameDay, getStocksForGameDay } from '../data/mockStocks';

let mockPhase = 'market_open';
let mockNews = getNewsForGameDay(2, 'STOCKPILOT').slice(0, 1);
const mockStock = getStocksForGameDay(2, 'STOCKPILOT')[0];
const mockYesterday = { ...getNewsForGameDay(1, 'STOCKPILOT')[0], relatedTickers: [mockStock.symbol] };
const mockClose = jest.fn().mockResolvedValue(undefined);
const mockAdvance = jest.fn().mockResolvedValue(undefined);
const mockSync = jest.fn().mockResolvedValue(undefined);
const mockTrading = () => ({
  sessionId: 'run', gameDay: 2, gameMode: 'limited_30', maxGameDay: 30,
  marketPhase: mockPhase, isGameComplete: false, loading: false, verifiedRun: true,
  account: { cash: 1900, holdings: [{ symbol: mockStock.symbol, shares: 1, averageCost: 100 }] },
  stocks: [mockStock], news: mockNews, newsHistory: [...mockNews, mockYesterday],
  tradedToday: {}, watchlistStocks: [], isWatchlisted: () => false,
  closeMarket: mockClose, setGameDay: mockAdvance, syncSessionValue: mockSync,
});

jest.mock('react-router-dom', () => {
  const React = require('react');
  return {
    Link: React.forwardRef(({ to, ...props }: any, ref: any) => <a href={to} ref={ref} {...props} />),
    useNavigate: () => jest.fn(), useSearchParams: () => [new URLSearchParams(), jest.fn()],
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
