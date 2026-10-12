/* eslint-disable testing-library/no-unnecessary-act */
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import SaveLoad from './SaveLoad';

const mockUser = { id: 'player-a' };
const mockRpc = jest.fn();
const mockReloadSession = jest.fn();
let mockActionPending = false;
const mockSlots = [{
  id: 'slot-a', slot_name: 'Day 3 Run', game_day: 3, game_mode: 'infinite', game_seed: 'market-a',
  cash_balance: 1200, net_worth: 2200, holdings_snapshot: [], created_at: '2026-10-01T00:00:00Z', ranked: true,
}];
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Link: ({ children }: any) => children,
}), { virtual: true });
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../context/GameContext', () => ({ useGame: () => ({
  sessionId: 'run-a', gameDay: 4, gameMode: 'infinite', marketSeed: 'MARKETA', marketPhase: 'market_open',
  ranked: true, actionPending: mockActionPending, reloadSession: mockReloadSession,
}) }));
jest.mock('../lib/supabase', () => ({
  isMissingDbObject: (error: any) => error?.code === 'PGRST202',
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: () => {
      const query: any = {};
      for (const name of ['select', 'eq', 'order']) query[name] = () => query;
      query.limit = async () => ({ data: mockSlots, error: null });
      return query;
    },
  },
}));

let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mockActionPending = false;
  mockRpc.mockReset().mockResolvedValue({ error: null });
  mockReloadSession.mockReset().mockResolvedValue(undefined);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(<SaveLoad />); });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

async function save() {
  const button = Array.from(container.querySelectorAll('button')).find(item => /Save/i.test(item.textContent ?? ''))!;
  await act(async () => button.click());
}

test('save falls back to the text-only RPC when the new signature is missing', async () => {
  mockRpc.mockResolvedValueOnce({ error: { code: 'PGRST202' } });
  await save();
  expect(mockRpc.mock.calls).toEqual([
    ['create_save_slot', { target_session_id: 'run-a', slot_name: 'Day 4 Run' }],
    ['create_save_slot', { p_slot_name: 'Day 4 Run' }],
  ]);
  expect(container.textContent).toContain('Game saved to cloud.');
});

test('save never retries an ordinary database error with another signature', async () => {
  mockRpc.mockResolvedValueOnce({ error: { message: 'Maximum save slots reached' } });
  await save();
  expect(mockRpc).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain('Save failed: Maximum save slots reached');
});

async function clickLoad() {
  const button = Array.from(container.querySelectorAll('button')).find(item => item.textContent?.trim() === 'Load')!;
  await act(async () => { button.click(); });
}

test('Load asks for confirmation without restoring the save', async () => {
  await clickLoad();
  expect(document.body.textContent).toContain('Load "Day 3 Run"?');
  expect(document.body.textContent).toContain('Loading this save will remove this run from the leaderboards (unranked).');
  expect(mockRpc).not.toHaveBeenCalledWith('restore_save_slot', expect.anything());
});

test('confirming Load restores the selected slot once', async () => {
  mockRpc.mockResolvedValueOnce({ data: { ranked: false }, error: null });
  await clickLoad();
  const confirm = Array.from(document.body.querySelectorAll('button')).find(item => item.textContent?.includes('Load Day 3 save'))!;
  await act(async () => { confirm.click(); });
  expect(mockRpc).toHaveBeenCalledWith('restore_save_slot', { p_slot_id: 'slot-a' });
  expect(mockRpc.mock.calls.filter(([name]) => name === 'restore_save_slot')).toHaveLength(1);
  expect(container.textContent).toContain('This run is now unranked');
});

test('Load confirmation is disabled while a game action is pending', async () => {
  await clickLoad();
  mockActionPending = true;
  await act(async () => { root.render(<SaveLoad />); });
  const confirm = Array.from(document.body.querySelectorAll('button')).find(item => item.textContent?.includes('Load Day 3 save'))!;
  expect(confirm.disabled).toBe(true);
});

test('cancel closes Load confirmation without an RPC', async () => {
  await clickLoad();
  const cancel = Array.from(document.body.querySelectorAll('button')).find(item => item.textContent?.trim() === 'Cancel')!;
  await act(async () => { cancel.click(); });
  expect(document.body.textContent).not.toContain('Load "Day 3 Run"?');
  expect(mockRpc).not.toHaveBeenCalledWith('restore_save_slot', expect.anything());
});
