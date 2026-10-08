/* These tests use ReactDOM directly, not Testing Library; act is required. */
/* eslint-disable testing-library/no-unnecessary-act, testing-library/no-render-in-setup */
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { GameProvider, useGame } from './GameContext';

const mockUser = { id: 'user-a' };
let mockSession: any;
let mockRpc: jest.Mock;
jest.mock('./AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../lib/api', () => ({ syncGameState: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../lib/supabase', () => ({ supabase: {
  from: (table: string) => {
    const query: any = {};
    for (const name of ['select', 'eq', 'order', 'limit', 'gt', 'range']) query[name] = () => query;
    query.maybeSingle = query.single = async () => ({ data: mockSession, error: null });
    query.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
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
