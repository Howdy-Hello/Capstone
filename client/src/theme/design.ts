// APEX TERMINAL - StockPilot Design System
// Dark-first, data-dense, finance-grade UI

export type DesignColors = {
  bg: string;
  surface: string;
  elevated: string;
  overlay: string;
  border: string;
  borderHi: string;
  green: string;
  greenBg: string;
  greenBd: string;
  greenText: string;
  red: string;
  redBg: string;
  redBd: string;
  redText: string;
  amber: string;
  amberBg: string;
  brand: string;
  brandMid: string;
  brandBg: string;
  brandBd: string;
  brandText: string;
  t1: string;
  t2: string;
  t3: string;
  t4: string;
};

export const DEFAULT_COLORS: DesignColors = {
  // Backgrounds
  bg:        '#050505',
  surface:   '#0B0B0B',
  elevated:  '#141414',
  overlay:   '#1E1E1E',

  // Borders. Deliberately low-contrast, but not invisible: the previous
  // #1C2436 measured 1.15:1 against the elevated surface it divides.
  border:    '#303030',
  borderHi:  '#484848',

  // Data colors (semantic only — never use for brand)
  green:     '#16C784',
  greenBg:   'rgba(22,199,132,0.12)',
  greenBd:   'rgba(22,199,132,0.32)',
  greenText: '#54E3AD',

  red:       '#F04452',
  redBg:     'rgba(240,68,82,0.12)',
  redBd:     'rgba(240,68,82,0.32)',
  redText:   '#FF7A85',

  amber:     '#F4B740',
  amberBg:   'rgba(244,183,64,0.12)',

  // Brand accent (interactive, focus, active)
  brand:     '#7C3AED',
  brandMid:  '#6D28D9',
  brandBg:   'rgba(124,58,237,0.14)',
  brandBd:   'rgba(124,58,237,0.38)',
  brandText: '#B69CFF',

  // Text scale. Verified by theme/contrast.test.ts against every surface of
  // every dark preset: t1 12.15:1, t2 8.96:1, t3 5.19:1 (all clear WCAG AA
  // 4.5:1) and t4 3.14:1, which is held to the 3:1 bar because it is only used
  // for de-emphasised micro-labels. t3 previously sat at #718096 and measured
  // as low as 3.31:1 on the elevated/overlay surfaces -- under AA on every
  // dark theme.
  t1:  '#FFFFFF',
  t2:  '#D6D6D6',
  t3:  '#AAAAAA',
  t4:  '#898989',
};

export const D: DesignColors = { ...DEFAULT_COLORS };

export function applyDesignColors(colors: DesignColors) {
  Object.assign(D, colors);
}

function relativeLuminance(hex: string): number {
  const raw = hex.trim().replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  const n = Number.parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(n)) return 0;
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Text colour for a solid fill. White whenever it clears AA 4.5:1, otherwise
// black, which then always does. Presets and custom themes pick their own fills.
export function readableOn(fill: string): string {
  return 1.05 / (relativeLuminance(fill) + 0.05) >= 4.5 ? "#FFFFFF" : "#000000";
}

// Shared card style
export const CARD = {
  get bgcolor() { return D.surface; },
  get border() { return `1px solid ${D.border}`; },
  borderRadius: 2,
  boxShadow:    'none',
} as const;

// Monospace font for all numbers/tickers, self-hosted through src/index.tsx
export const MONO = "'Roboto Mono', 'Courier New', monospace" as const;

// Format helpers
export function money(n: number): string {
  return `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function pct(n: number, decimals = 2): string {
  const fixed = n.toFixed(decimals);
  if (Number(fixed) === 0) return `${Math.abs(Number(fixed)).toFixed(decimals)}%`;
  return `${n >= 0 ? '+' : ''}${fixed}%`;
}

// True when a percentage would display as 0.00%: neither a gain nor a loss.
export function isFlat(n: number): boolean {
  return Math.abs(n) < 0.005;
}
