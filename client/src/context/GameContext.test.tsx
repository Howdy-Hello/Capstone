/* These tests use ReactDOM directly, not Testing Library; act is required. */
/* eslint-disable testing-library/no-unnecessary-act, testing-library/no-render-in-setup */
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { GameProvider, MARKET_CLOSED_MESSAGE, useGame } from './GameContext';
import { advanceSessionDay, ApiError, ensureSessionMarket } from '../lib/api';
import { getCumulativeTradeTotal, getPortfolioValue } from '../data/tradingState';
import { recordTradeJournalEntry } from '../lib/tradeJournal';

const mockUser = { id: 'user-a' };
let mockSession: any;
let mockRpc: jest.Mock;
let mockMarketError: unknown;
let mockHoldings: any[];
const mockFrom = jest.fn();
jest.mock('./AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../lib/tradeJournal', () => ({
  ...jest.requireActual('../lib/tradeJournal'),
  recordTradeJournalEntry: jest.fn().mockResolvedValue(true),
}));
jest.mock('../lib/api', () => ({
  ...jest.requireActual('../lib/api'),
  syncGameState: jest.fn().mockResolvedValue(undefined),
  ensureSessionMarket: jest.fn().mockResolvedValue({ currentDay: 1 }),
  advanceSessionDay: jest.fn(),
}));
jest.mock('../lib/supabase', () => ({
  isMissingDbObject: (error: any) => error?.code === 'PGRST202',
  supabase: {
  from: (table: string) => {
    mockFrom(table);
    const query: any = {};
    for (const name of ['select', 'eq', 'order', 'limit', 'gt', 'gte', 'range']) query[name] = () => query;
    query.maybeSingle = query.single = async () => ({ data: mockSession, error: null });
    query.then = (resolve: any) => Promise.resolve({ data: table === 'session_stock_prices'
      ? [{ game_day: 1, symbol: 'GVE', open_price: 100, high_price: 100, low_price: 100, close_price: 100, volume: 1000, event_impact: 0 }]
        : table === 'holdings' ? mockHoldings : [], error: table === 'session_stock_prices' ? mockMarketError : null }).then(resolve);
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
  mockHoldings = [];
  mockFrom.mockClear();
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
    await expect(game.reloadSession()).rejects.toThrow('Market generation is not configured.');
  });
  expect(game.error).toBe('Market generation is not configured.');
  expect(mockRpc).not.toHaveBeenCalled();
  await act(async () => { await game.reloadSession(); });
  expect(game.error).toBeNull();
  expect(game.loading).toBe(false);
});

test('a successful trade refreshes only account rows and keeps cumulative slippage', async () => {
  const stock = game.stocks[0];
  const oldHistory = game.getHistory(stock.symbol);
  mockRpc.mockImplementation(async () => {
    mockSession = { ...mockSession, cash_balance: 1898, unpaid_bills: 10 };
    mockHoldings = [{ quantity: 1, average_purchase_price: 102, stocks: { symbol: stock.symbol, company_name: stock.name } }];
    return { data: { symbol: stock.symbol, cash: 1898, quantity: 1, average_purchase_price: 102, execution_price: 102 }, error: null };
  });
  mockFrom.mockClear();
  (ensureSessionMarket as jest.Mock).mockClear();
  await act(async () => { expect(await game.buyStock(stock)).toBe(true); });
  expect(ensureSessionMarket).not.toHaveBeenCalled();
  expect(mockFrom.mock.calls.map(([table]) => table).sort()).toEqual(['game_sessions', 'holdings']);
  expect(game.account.cash).toBe(1898);
  expect(game.account.holdings[0].shares).toBe(1);
  expect(game.account.unpaidBills).toBe(10);
  expect(game.getHistory(stock.symbol)).toEqual(oldHistory);
  const worth = game.account.cash + getPortfolioValue(game.account, game.stocks);
  expect(game.getTradeQuote(stock, 'buy').total).toBe(getCumulativeTradeTotal(stock.currentPrice, 1, 1, worth, 'buy'));
});

test('a missing checked RPC falls back to the legacy trade with the live base price', async () => {
  const stock = game.stocks[0];
  mockRpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } });
  await act(async () => { expect(await game.buyStock({ ...stock, currentPrice: 0.01 }, 2)).toBe(false); });
  expect(mockRpc).toHaveBeenCalledTimes(2);
  expect(mockRpc.mock.calls[1]).toEqual(['execute_trade', {
    target_session_id: 'run-a', target_symbol: stock.symbol, target_trade_type: 'buy',
    target_game_day: 1, target_quantity: 2, target_price: stock.currentPrice,
  }]);
  expect(game.error).toBe('Not enough cash');
});

test('BUG-060: trades are refused after the close without calling a trade RPC', async () => {
  mockSession = { ...mockSession, market_phase: 'after_hours' };
  await act(async () => { await game.reloadSession(); });
  expect(game.marketPhase).toBe('after_hours');
  await act(async () => { expect(await game.buyStock(game.stocks[0])).toBe(false); });
  expect(game.error).toBe(MARKET_CLOSED_MESSAGE);
  expect(mockRpc).not.toHaveBeenCalled();
});

test('BUG-060: without a market_phase column, a close recorded by another tab blocks trading', async () => {
  const { market_phase: _phase, ...legacySession } = mockSession;
  mockSession = legacySession;
  await act(async () => { await game.reloadSession(); });
  expect(game.marketPhase).toBe('market_open');
  localStorage.setItem('stockpilot-market-phase:run-a', 'after_hours:1');
  await act(async () => { expect(await game.sellStock(game.stocks[0])).toBe(false); });
  expect(game.error).toBe(MARKET_CLOSED_MESSAGE);
  expect(game.marketPhase).toBe('after_hours');
  expect(mockRpc).not.toHaveBeenCalled();
});

test('BUG-060: a stale after-hours key does not block a run whose server phase is open', async () => {
  localStorage.setItem('stockpilot-market-phase:run-a', 'after_hours:1');
  await act(async () => { expect(await game.buyStock(game.stocks[0])).toBe(false); });
  expect(mockRpc).toHaveBeenCalledTimes(1);
  expect(game.error).toBe('Not enough cash');
});

test('BUG-060: the legacy trade result still records the journal at its fill price', async () => {
  const stock = game.stocks[0];
  mockRpc
    .mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } })
    .mockResolvedValueOnce({ data: { symbol: stock.symbol, cash: 1898.5, quantity: 1, average_purchase_price: 101.5, price: 101.5 }, error: null });
  const journal = { thesis: 'Grid contract adds revenue', horizonDays: 3, exitPlan: 'Sell if margins fall' };
  await act(async () => { expect(await game.buyStock(stock, 1, journal)).toBe(true); });
  expect(recordTradeJournalEntry).toHaveBeenCalledWith(expect.objectContaining({ executionPrice: 101.5 }));
});

test('BUG-060: a legacy result with no price field records the price the trade was sent at', async () => {
  const stock = game.stocks[0];
  (recordTradeJournalEntry as jest.Mock).mockClear();
  mockRpc
    .mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } })
    .mockResolvedValueOnce({ data: { symbol: stock.symbol, cash: 1900, quantity: 1, average_purchase_price: stock.currentPrice }, error: null });
  const journal = { thesis: 'Steady demand', horizonDays: 10, exitPlan: '' };
  await act(async () => { expect(await game.buyStock(stock, 1, journal)).toBe(true); });
  expect(recordTradeJournalEntry).toHaveBeenCalledWith(expect.objectContaining({ executionPrice: stock.currentPrice }));
});

// Another tab's write: it lands in shared storage, then this tab gets the event.
function otherTabWrites(key: string, value: string) {
  const oldValue = localStorage.getItem(key);
  localStorage.setItem(key, value);
  window.dispatchEvent(new StorageEvent('storage', { key, oldValue, newValue: value }));
}

test('BUG-060: without a market_phase column, another tab closing the market disables trading here', async () => {
  const { market_phase: _phase, ...legacySession } = mockSession;
  mockSession = legacySession;
  await act(async () => { await game.reloadSession(); });
  expect(game.marketPhase).toBe('market_open');
  await act(async () => { otherTabWrites('stockpilot-market-phase:run-a', 'after_hours:1'); });
  expect(game.marketPhase).toBe('after_hours');
});

test('BUG-060: with a server-side phase, another tab closing the market also disables trading here', async () => {
  mockSession = { ...mockSession, market_phase: 'after_hours' };
  await act(async () => { otherTabWrites('stockpilot-market-phase:run-a', 'after_hours:1'); });
  expect(game.marketPhase).toBe('after_hours');
  expect(game.loading).toBe(false);
});

test('BUG-060: another tab advancing the run reloads it here instead of staying after hours', async () => {
  mockSession = { ...mockSession, market_phase: 'after_hours' };
  await act(async () => { otherTabWrites('stockpilot-market-phase:run-a', 'after_hours:1'); });
  expect(game.marketPhase).toBe('after_hours');
  mockSession = { ...mockSession, current_day: 2, market_phase: 'market_open' };
  await act(async () => { otherTabWrites('stockpilot-market-phase:run-a', 'market_open'); });
  expect(game.gameDay).toBe(2);
  expect(game.marketPhase).toBe('market_open');
});

test('BUG-060: a change from another tab during an action reloads as soon as the action ends', async () => {
  let finishTrade!: (value: unknown) => void;
  mockRpc.mockImplementationOnce(() => new Promise((resolve) => { finishTrade = resolve; }));
  let trade!: Promise<boolean>;
  await act(async () => { trade = game.buyStock(game.stocks[0]); });
  mockSession = { ...mockSession, current_day: 2 };
  (ensureSessionMarket as jest.Mock).mockClear();
  await act(async () => { otherTabWrites('stockpilot-market-phase:run-a', 'market_open'); });
  expect(ensureSessionMarket).not.toHaveBeenCalled(); // The trade still holds the action lock.
  await act(async () => {
    finishTrade({ data: null, error: { message: 'Not enough cash' } });
    await trade;
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  expect(ensureSessionMarket).toHaveBeenCalled();
  expect(game.gameDay).toBe(2);
  expect(game.actionPending).toBe(false);
});

test('BUG-060: storage events for another run are ignored', async () => {
  (ensureSessionMarket as jest.Mock).mockClear();
  await act(async () => { otherTabWrites('stockpilot-market-phase:run-b', 'after_hours:1'); });
  expect(game.marketPhase).toBe('market_open');
  expect(ensureSessionMarket).not.toHaveBeenCalled();
});

test.each([
  'The market is closed. Advance to the next day to trade.',
  'Market data for this day is not ready yet',
])('shows the actionable trade error: %s', async (message) => {
  mockRpc.mockResolvedValue({ data: null, error: { message } });
  await act(async () => { expect(await game.buyStock(game.stocks[0])).toBe(false); });
  expect(game.error).toBe(message);
  expect(mockRpc).toHaveBeenCalledTimes(1);
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
