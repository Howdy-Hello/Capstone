/* eslint-disable testing-library/no-unnecessary-act */
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import DailyGoalRefresh from './DailyGoalRefresh';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-22T04:59:58Z'));
  container = document.createElement('div'); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); jest.useRealTimers(); });

test('the visible countdown ticks each second and resets for the next refresh', async () => {
  await act(async () => { root.render(<DailyGoalRefresh refreshAt="2026-11-22T05:00:00.000Z" />); });
  expect(container.textContent).toContain('Refreshes in 0h 0m 2s');
  expect(container.textContent).toContain('Midnight Toronto time');
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(container.textContent).toContain('Refreshes in 0h 0m 1s');
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(container.textContent).toContain('Refreshes in 0h 0m 0s');
  await act(async () => { root.render(<DailyGoalRefresh refreshAt="2026-11-23T05:00:00.000Z" />); });
  expect(container.textContent).toContain('Refreshes in 24h 0m 0s');
});
