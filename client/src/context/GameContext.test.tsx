/* These tests use ReactDOM directly, not Testing Library; act is required. */
/* eslint-disable testing-library/no-unnecessary-act, testing-library/no-render-in-setup */
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { GameProvider, useGame } from './GameContext';
import { advanceSessionDay, ApiError, ensureSessionMarket } from '../lib/api';

const mockUser = { id: 'user-a' };
let mockSession: any;
let mockRpc: jest.Mock;
let mockMarketError: unknown;
jest.mock('./AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../lib/api', () => ({
  ...jest.requireActual('../lib/api'),
  syncGameState: jest.fn().mockResolvedValue(undefined),
  ensureSessionMarket: jest.fn().mockResolvedValue({ currentDay: 1 }),
  advanceSessionDay: jest.fn(),
}));
jest.mock('../lib/supabase', () => ({ supabase: {
  from: (table: string) => {
    const query: any = {};
    for (const name of ['select', 'eq', 'order', 'limit', 'gt', 'gte', 'range']) query[name] = () => query;
    query.maybeSingle = query.single = async () => ({ data: mockSession, error: null });
    query.then = (resolve: any) => Promise.resolve({ data: table === 'session_stock_prices'
      ? [{ game_day: 1, symbol: 'GVE', open_price: 100, high_price: 100, low_price: 100, close_price: 100, volume: 1000, event_impact: 0 }]
        : [], error: table === 'session_stock_prices' ? mockMarketError : null }).then(resolve);
    return query;
  },
  rpc: (...args: any[]) => mockRpc(...args),
} }));
let game: ReturnType<typeof useGame>;
function Probe() { game = useGame(); return <span>{game.gameDay}</span>; }
let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: () => 'aaaaaaaa-0000-0000-0000-000000000001' } });
  mockSession = { id: 'run-a', current_day: 1, cash_balance: 2000, game_mode: 'limited_30', game_seed: 'STOCKPILOT', market_phase: 'market_open', advisor_ids: [], trusted_state: true };
  mockRpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'Not enough cash' } });
  mockMarketError = null;
  (ensureSessionMarket as jest.Mock).mockReset().mockResolvedValue({ currentDay: 1 });
  (advanceSessionDay as jest.Mock).mockReset();
  localStorage.setItem('stockpilot-current-game-day:run-a', '20');
  container = document.createElement('div');
  root = createRoot(container);
  await act(async () => { root.render(<GameProvider><Probe /></GameProvider>); });
});
afterEach(async () => { await act(async () => root.unmount()); localStorage.clear(); });

test('database Day 1 overrides the later cached day', () => {
  expect(game.gameDay).toBe(1);
  expect(game.account.cash).toBe(2000);
  expect(mockRpc).not.toHaveBeenCalled();
});

test('a captured stock object cannot supply a stale quote', () => {
  const stock = game.stocks[0];
  expect(game.getTradeQuote({ ...stock, currentPrice: 0.01 }, 'buy').basePrice).toBe(stock.currentPrice);
});

test('rapid trade clicks share one in-flight guard and failed trades preserve cash', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  await act(async () => {
    const first = game.buyStock(game.stocks[0]);
    const second = game.buyStock(game.stocks[0]);
    expect(await second).toBe(false);
    expect(await first).toBe(false);
  });
  expect(mockRpc).toHaveBeenCalledTimes(1);
  expect(mockRpc.mock.calls[0][0]).toBe('execute_trade_checked');
  expect(game.account.cash).toBe(2000);
  expect(game.error).toBe('Not enough cash');
  expect(game.actionPending).toBe(false);
  spy.mockRestore();
});

test('connection failures are not reported as insufficient funds', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  mockRpc.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } });
  await act(async () => { await game.sellStock(game.stocks[0]); });
  expect(game.error).toMatch(/connection/);
  expect(game.error).not.toMatch(/Not enough/);
  spy.mockRestore();
});

test('market configuration errors remain specific and a successful retry clears them', async () => {
  (ensureSessionMarket as jest.Mock).mockRejectedValueOnce(new ApiError('Market generation is not configured.', 503));
  await act(async () => {
    expect(await game.buyStock(game.stocks[0])).toBe(false);
  });
  expect(game.error).toBe('Market generation is not configured.');
  expect(mockRpc).not.toHaveBeenCalled();
  await act(async () => { await game.reloadSession(); });
  expect(game.error).toBeNull();
  expect(game.loading).toBe(false);
});

test('session reload uses the latest database day and phase', async () => {
  (ensureSessionMarket as jest.Mock).mockImplementationOnce(async () => {
    mockSession = { ...mockSession, current_day: 2, cash_balance: 1700, market_phase: 'after_hours' };
    return { currentDay: 2 };
  });
  await act(async () => { await game.reloadSession(); });
  expect(game.gameDay).toBe(2);
  expect(game.marketPhase).toBe('after_hours');
  expect(game.account.cash).toBe(1700);
  expect(game.stocks).toHaveLength(0); // No made-up prices when Day 2's rows are missing.
});

test('a committed day and bill survive a failed market read and reload recovers', async () => {
  (advanceSessionDay as jest.Mock).mockImplementationOnce(async () => {
    mockSession = { ...mockSession, current_day: 2, cash_balance: 1900, market_phase: 'market_open' };
    return { day: 2, cash: 1900, cycles_charged: 1, bill_total: 100, amount_paid: 100, shortfall: 0 };
  });
  mockMarketError = { message: 'Market read failed' };
  await act(async () => { await game.setGameDay(2); });
  expect(game.gameDay).toBe(2);
  expect(game.account.cash).toBe(1900);
  expect(game.latestBill?.paid).toBe(100);
  expect(game.stocks).toHaveLength(0);
  expect(game.error).toBe('Market read failed');
  expect(game.actionPending).toBe(false);
  mockMarketError = null;
  await act(async () => { await game.reloadSession(); });
  expect(game.error).toBeNull();
  expect(advanceSessionDay).toHaveBeenCalledTimes(1);
});
