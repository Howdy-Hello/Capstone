/* eslint-disable testing-library/no-unnecessary-act */
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { selectGoals, useDailyGoals } from './useDailyGoals';

const mockUser = { id: 'user-a' };
let mockGame: any;
let mockMarkers: any[];
let mockTrades: any[];
let mockSaveError: boolean;
const mockUpsert = jest.fn();
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../context/GameContext', () => ({ useGame: () => mockGame }));
jest.mock('../lib/supabase', () => ({ supabase: { from: (table: string) => {
  const filters: Array<(row: any) => boolean> = [];
  const query: any = {
    select: () => query,
    eq: (key: string, value: any) => { filters.push(row => row[key] === value); return query; },
    gte: (key: string, value: any) => { filters.push(row => row[key] >= value); return query; },
    lt: (key: string, value: any) => { filters.push(row => row[key] < value); return query; },
    then: (resolve: any) => Promise.resolve({ data: (table === 'trades' ? mockTrades : mockMarkers).filter(row => filters.every(f => f(row))), error: null }).then(resolve),
    upsert: async (rows: any[], options: any) => {
      mockUpsert(rows, options);
      if (mockSaveError) return { error: { message: 'offline' } };
      for (const row of rows) {
        if (!mockMarkers.some(m => m.user_id === row.user_id && m.session_id === row.session_id && m.goal_date === row.goal_date && m.goal_id === row.goal_id)) mockMarkers.push(row);
      }
      return { error: null };
    },
  };
  return query;
} } }));

let daily: ReturnType<typeof useDailyGoals>;
function Probe() { daily = useDailyGoals(); return <span>{daily.date}</span>; }
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-22T04:59:58Z'));
  mockGame = { gameDay: 4, sessionId: 'run-a', watchlistSymbols: [], account: { cash: 0, holdings: [] }, stocks: [] };
  mockMarkers = []; mockTrades = []; mockSaveError = false; mockUpsert.mockClear();
  container = document.createElement('div');
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); jest.useRealTimers(); });
const render = async () => { await act(async () => { root.render(<Probe />); }); };
const ids = () => daily.goals.map(g => g.id);

test('three action goals remain stable on reload, rotate daily, and never require writing', () => {
  let previous: string[] = [];
  for (let day = 1; day <= 28; day += 1) {
    const date = `2026-11-${String(day).padStart(2, '0')}`;
    const goals = selectGoals('user-a', date);
    expect(goals).toHaveLength(3);
    expect(goals.map(g => g.id)).not.toEqual(previous);
    expect(selectGoals('user-a', date)).toEqual(goals);
    expect(goals.every(g => g.href && !('kind' in g) && !g.id.startsWith('learn_'))).toBe(true);
    previous = goals.map(g => g.id);
  }
});

test('completion is automatic and survives changing game days on the same calendar day', async () => {
  mockGame.watchlistSymbols = ['AAA', 'BBB'];
  mockTrades = [{ session_id: 'run-a', trade_type: 'buy', quantity: 1, executed_at: '2026-11-21T10:00:00.000Z' }];
  await render();
  expect(daily.goals.find(g => g.id === 'watch2')?.done).toBe(true);
  expect(daily.goals.find(g => g.id === 'buy1')?.done).toBe(true);
  expect(mockUpsert).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ goal_date: '2026-11-21', game_day: 4 })]), expect.objectContaining({ onConflict: 'user_id,session_id,goal_date,goal_id' }));
  const before = ids();
  mockGame = { ...mockGame, gameDay: 5, watchlistSymbols: [] };
  await render();
  expect(ids()).toEqual(before);
  expect(daily.goals.find(g => g.id === 'watch2')?.done).toBe(true);
  expect(daily.goals.find(g => g.id === 'watch2')?.progress).toBe(100);
  expect(daily.goals.find(g => g.id === 'buy1')?.done).toBe(true);
});

test('midnight refreshes an open page without advancing the game or counting yesterday trades', async () => {
  mockTrades = [{ session_id: 'run-a', trade_type: 'buy', quantity: 1, executed_at: '2026-11-21T10:00:00.000Z' }];
  await render();
  const before = ids();
  expect(daily.goals.find(g => g.id === 'buy1')?.done).toBe(true);
  await act(async () => { jest.advanceTimersByTime(2100); });
  expect(daily.date).toBe('2026-11-22');
  expect(ids()).not.toEqual(before);
  expect(mockGame.gameDay).toBe(4);
  expect(daily.goals.find(g => g.id === 'buy1')?.done).toBe(false);
  expect(daily.goals.find(g => g.id === 'buy1')?.current).toBe(0);
  expect(daily.refreshAt).toBe('2026-11-23T05:00:00.000Z');
});

test('focus catches up after the browser sleeps past midnight', async () => {
  await render();
  jest.setSystemTime(new Date('2026-11-24T15:00:00Z'));
  await act(async () => { window.dispatchEvent(new Event('focus')); });
  expect(daily.date).toBe('2026-11-24');
});

test('a failed save remains incomplete, stops retrying, and can be retried explicitly', async () => {
  mockGame.watchlistSymbols = ['AAA', 'BBB']; mockSaveError = true;
  await render();
  expect(daily.goals.find(g => g.id === 'watch2')?.done).toBe(false);
  expect(daily.persistenceError).toMatch(/could not be saved/);
  expect(mockUpsert).toHaveBeenCalledTimes(1);
  mockSaveError = false;
  await act(async () => { daily.retryPersistence(); });
  expect(daily.goals.find(g => g.id === 'watch2')?.done).toBe(true);
  expect(daily.persistenceError).toBeNull();
});

test('another run and legacy game-day markers cannot complete today goals', async () => {
  mockMarkers = [
    { user_id: 'user-a', session_id: 'run-b', goal_date: '2026-11-21', goal_id: 'buy1' },
    { user_id: 'user-a', session_id: 'run-a', goal_date: null, goal_id: 'watch2' },
  ];
  await render();
  expect(daily.completedCount).toBe(0);
});

test('loading placeholders cannot complete goals before the account is ready', async () => {
  mockGame = { ...mockGame, loading: true, account: { cash: 2000, holdings: [] } };
  await render();
  expect(mockUpsert).not.toHaveBeenCalled();
  mockGame = { ...mockGame, loading: false };
  await render();
  expect(daily.goals.find(g => g.id === 'cash20')?.done).toBe(true);
});
