/* eslint-disable testing-library/no-unnecessary-act */
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import AuthPage from './AuthPage';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ search: '?mode=signup' }),
}), { virtual: true });
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('../lib/authThrottle', () => ({ useAuthThrottle: () => ({ isLocked: false, attemptsLeft: 5 }) }));
jest.mock('../lib/supabase', () => ({
  supabase: { auth: {} }, isRememberMeEnabled: () => false, setRememberMe: jest.fn(),
}));

let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(<AuthPage />); });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

async function fill(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit() {
  await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
}

test('signup focuses the first invalid field in display order', async () => {
  const [name, email, password] = Array.from(container.querySelectorAll('input:not([type=checkbox])')) as HTMLInputElement[];
  await submit();
  expect(document.activeElement).toBe(name);
  expect(name.getAttribute('aria-invalid')).toBe('true');
  await fill(name, 'Test Player');
  await submit();
  expect(document.activeElement).toBe(email);
  await fill(email, 'player@example.com');
  await submit();
  expect(document.activeElement).toBe(password);
});
