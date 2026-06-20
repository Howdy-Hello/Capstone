// APEX TERMINAL — StockPilot Design System
// Dark-first, data-dense, finance-grade UI

export const D = {
  // Backgrounds
  bg:        '#09090F',
  surface:   '#0E101A',
  elevated:  '#131723',
  overlay:   '#1A1F2E',

  // Borders
  border:    '#1C2436',
  borderHi:  '#263044',

  // Data colors (semantic only — never use for brand)
  green:     '#22C55E',
  greenBg:   'rgba(34,197,94,0.08)',
  greenBd:   'rgba(34,197,94,0.22)',
  greenText: '#4ADE80',

  red:       '#EF4444',
  redBg:     'rgba(239,68,68,0.08)',
  redBd:     'rgba(239,68,68,0.22)',
  redText:   '#F87171',

  amber:     '#F59E0B',
  amberBg:   'rgba(245,158,11,0.08)',

  // Brand accent (interactive, focus, active)
  brand:     '#7C3AED',
  brandMid:  '#6D28D9',
  brandBg:   'rgba(124,58,237,0.1)',
  brandBd:   'rgba(124,58,237,0.3)',
  brandText: '#A78BFA',

  // Text scale
  t1:  '#F1F5F9',
  t2:  '#94A3B8',
  t3:  '#475569',
  t4:  '#1E293B',
};

// Shared card style
export const CARD = {
  bgcolor:      D.surface,
  border:       `1px solid ${D.border}`,
  borderRadius: 2,
  boxShadow:    'none',
} as const;

// Monospace font for all numbers/tickers
export const MONO = "'Courier New', Courier, monospace" as const;

// Format helpers
export function money(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function pct(n: number, decimals = 2): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}
