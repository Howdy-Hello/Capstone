/* eslint-disable testing-library/no-unnecessary-act */
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import SaveLoad from './SaveLoad';

const mockUser = { id: 'player-a' };
const mockRpc = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Link: ({ children }: any) => children,
}), { virtual: true });
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../context/GameContext', () => ({ useGame: () => ({
  sessionId: 'run-a', gameDay: 4, gameMode: 'infinite', actionPending: false,
}) }));
jest.mock('../lib/supabase', () => ({
  isMissingDbObject: (error: any) => error?.code === 'PGRST202',
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: () => {
      const query: any = {};
      for (const name of ['select', 'eq', 'order']) query[name] = () => query;
      query.limit = async () => ({ data: [], error: null });
      return query;
    },
  },
}));

let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mockRpc.mockReset().mockResolvedValue({ error: null });
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
    ['create_save_slot', { slot_name: 'Day 4 Run' }],
  ]);
  expect(container.textContent).toContain('Game saved to cloud.');
});

test('save never retries an ordinary database error with another signature', async () => {
  mockRpc.mockResolvedValueOnce({ error: { message: 'Maximum save slots reached' } });
  await save();
  expect(mockRpc).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain('Save failed: Maximum save slots reached');
});
