import { formatGoalCountdown, getDailyGoalWindow } from './dailyGoals';

test.each([
  ['2026-11-22T04:59:59Z', '2026-11-21', '2026-11-21T05:00:00.000Z', '2026-11-22T05:00:00.000Z'],
  ['2026-11-22T05:00:00Z', '2026-11-22', '2026-11-22T05:00:00.000Z', '2026-11-23T05:00:00.000Z'],
  ['2026-03-08T16:00:00Z', '2026-03-08', '2026-03-08T05:00:00.000Z', '2026-03-09T04:00:00.000Z'],
  ['2026-11-01T16:00:00Z', '2026-11-01', '2026-11-01T04:00:00.000Z', '2026-11-02T05:00:00.000Z'],
])('Toronto daily window at %s includes daylight-saving boundaries', (now, date, startAt, refreshAt) => {
  expect(getDailyGoalWindow(Date.parse(now))).toEqual({ date, startAt, refreshAt });
});

test('countdown rounds up partial seconds and never becomes negative', () => {
  const end = '2026-11-22T05:00:00.000Z';
  expect(formatGoalCountdown(end, Date.parse('2026-11-22T02:56:55Z'))).toBe('2h 3m 5s');
  expect(formatGoalCountdown(end, Date.parse(end) - 1)).toBe('0h 0m 1s');
  expect(formatGoalCountdown(end, Date.parse(end) + 1000)).toBe('0h 0m 0s');
});
