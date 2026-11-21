const torontoTime = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function partsAt(time: number) {
  return Object.fromEntries(torontoTime.formatToParts(time).map(({ type, value }) => [type, Number(value)]));
}

function midnight(calendarDay: number) {
  let time = calendarDay;
  // Resolve the Toronto offset at midnight itself, including daylight-saving changes.
  for (let i = 0; i < 2; i += 1) {
    const p = partsAt(time);
    const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    time = calendarDay - (local - time);
  }
  return new Date(time).toISOString();
}

export function getDailyGoalWindow(now = Date.now()) {
  const p = partsAt(now);
  const calendarDay = Date.UTC(p.year, p.month - 1, p.day);
  return {
    date: new Date(calendarDay).toISOString().slice(0, 10),
    startAt: midnight(calendarDay),
    refreshAt: midnight(calendarDay + 86400000),
  };
}

export function formatGoalCountdown(refreshAt: string, now = Date.now()) {
  const seconds = Math.max(0, Math.ceil((Date.parse(refreshAt) - now) / 1000));
  return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s`;
}

export const DAILY_GOALS_CHANGED = 'stockpilot:daily-goals-changed';
