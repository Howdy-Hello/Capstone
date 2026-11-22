/* eslint-disable testing-library/no-unnecessary-act */
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { StockCandleChart } from './Candlestick';
import { StockPriceHistory } from '../data/mockStocks';
import { buildMarketPrelude } from '../data/marketPrelude';
import { historyFromRows } from '../data/sessionMarket';

jest.mock('recharts', () => {
  const { cloneElement } = jest.requireActual<typeof import('react')>('react');
  return {
    ...jest.requireActual('recharts'),
    ResponsiveContainer: ({ children }: { children: React.ReactElement<{ width: number; height: number }> }) => cloneElement(children, { width: 700, height: 320 }),
  };
});

const history: StockPriceHistory[] = Array.from({ length: 90 }, (_, index) => ({
  priceId: String(index), stockId: 'stock', symbol: 'TEST', gameDay: index + 1,
  openPrice: 10, highPrice: 12, lowPrice: 8, closePrice: index % 2 ? 9 : 11,
  volume: 100, change: 1, changePercent: 10, eventImpact: 0,
}));
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
async function show(day: number) {
  await act(async () => root.render(<StockCandleChart history={history.slice(0, day)} gameDay={day} />));
}
async function choose(label: string) {
  const button = Array.from(container.querySelectorAll('button')).find((item) => item.textContent === label)!;
  await act(async () => button.click());
}
function candles() {
  return Array.from(container.querySelectorAll<SVGRectElement>('.recharts-bar-rectangle rect'));
}
function centers() {
  return candles().map((rect) => Number(rect.getAttribute('x')) + Number(rect.getAttribute('width')) / 2);
}

test('short histories stay at the left and fill rightward as days arrive', async () => {
  await show(1);
  expect(candles()).toHaveLength(1);
  const left = centers()[0];
  expect(left).toBeLessThan(100);
  await show(3);
  expect(candles()).toHaveLength(3);
  expect(centers()[0]).toBeCloseTo(left);
  expect(centers()[2]).toBeLessThan(150);
  expect(container.textContent).not.toContain('D4');
  const spacing = centers()[1] - centers()[0];
  await choose('7 days');
  expect(centers()[1] - centers()[0]).toBeGreaterThan(spacing * 3);
  expect(centers()[0]).toBeLessThan(150);
});

test.each([7, 15, 30, 60])('%s-day range shows only the latest days and their OHLC candles', async (days) => {
  await show(90);
  await choose(`${days} days`);
  expect(candles()).toHaveLength(days);
  expect(container.textContent).toContain('D90');
  expect(container.textContent).not.toContain(`D${90 - days}`);
  expect(container.querySelectorAll('.recharts-bar-rectangle line')).toHaveLength(days);
  expect(new Set(candles().map((rect) => rect.getAttribute('fill'))).size).toBe(2);
});

test('shorter ranges draw thicker candles while leaving gaps between days', async () => {
  await show(90);
  let previousWidth = 0;
  for (const days of [60, 30, 15, 7]) {
    await choose(`${days} days`);
    const width = Number(candles()[0].getAttribute('width'));
    expect(width).toBeGreaterThan(previousWidth);
    expect(width).toBeLessThan(centers()[1] - centers()[0]);
    previousWidth = width;
  }
});

test('all time keeps early histories left-aligned and includes history beyond 60 days', async () => {
  await show(3);
  await choose('All time');
  expect(candles()).toHaveLength(3);
  expect(centers()[2]).toBeLessThan(100);
  await show(90);
  expect(candles()).toHaveLength(90);
  expect(centers()[0]).toBeLessThan(100);
});

test('missing days reserve space without drawing a candle', async () => {
  await act(async () => root.render(<StockCandleChart history={[history[0], history[2]]} gameDay={3} />));
  const missingGap = centers()[1] - centers()[0];
  await show(3);
  expect(candles()).toHaveLength(3);
  expect(missingGap).toBeCloseTo((centers()[1] - centers()[0]) * 2);
});

test('Day 1 renders all 15 background candles, including the all-time range', async () => {
  const prelude = buildMarketPrelude([{
    game_day: 1, symbol: 'TEST', open_price: 10, high_price: 12, low_price: 8, close_price: 11, volume: 100, event_impact: 0,
  }], 'ABC123');
  const seededHistory = [...historyFromRows(prelude.prices), history[0]];
  await act(async () => root.render(<StockCandleChart history={seededHistory} gameDay={1} />));
  expect(candles()).toHaveLength(16);
  expect(container.textContent).toContain('−15d');
  expect(container.textContent).not.toContain('previous 15 days');
  await choose('7 days');
  expect(candles()).toHaveLength(7);
  await choose('All time');
  expect(candles()).toHaveLength(16);
});
