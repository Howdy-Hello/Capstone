import { createHmac } from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  DatabaseEvent,
  DatabasePrice,
  DatabaseStock,
} from '../market/infiniteMarket';
import {
  clampRunDay,
  generateSessionNews,
  generateSessionPrices,
  MarketScript,
  sanitizeNews,
  SessionGameMode,
} from '../market/sessionMarket';

// Generates each run's market on the server and stores it in
// session_stock_prices / session_market_news (see migration 202609250001).

export type MarketSession = {
  id: string;
  user_id: string;
  status: string;
  market_phase: string;
  current_day: number;
  game_mode: string | null;
  game_seed: string | null;
  market_generated_through: number | null;
  market_fingerprint: string | null;
  market_seed_secret: boolean | null;
  market_engine?: number | null;
};

// Pending migrations add fields such as market_phase. Selecting all columns
// keeps the server usable while the database is still on the earlier schema.
export const SESSION_COLUMNS = '*';

/**
 * Engine 1: infinite runs replay the shared 30-day database script (the same
 * prices and news in every run, readable in the repo). Engine 2 (runs started
 * from migration 202610060002): only the listing prices come from the script;
 * every later day and all news are generated from the run's own seed.
 */
export function marketEngine(session: Pick<MarketSession, 'market_engine'>) {
  return (session.market_engine ?? 1) >= 2 ? 2 : 1;
}

/** Days generated per round trip; bounds memory and each upsert's size. */
const CHUNK_DAYS = 60;
const UPSERT_BATCH = 1000;
const PAGE_SIZE = 1000;
const SCRIPT_TTL_MS = 10 * 60 * 1000;
const DEV_FALLBACK_SECRET = 'stockpilot-dev-only-market-secret';

export function normalizeMode(mode: string | null | undefined): SessionGameMode {
  return mode === 'limited_30' ? 'limited_30' : 'infinite';
}

/** Must match the fingerprint restore_save_slot computes (202610060002). */
export function marketFingerprint(
  session: Pick<MarketSession, 'game_mode' | 'game_seed' | 'market_engine'>
) {
  const base = `${normalizeMode(session.game_mode)}:${session.game_seed ?? ''}`;
  return marketEngine(session) >= 2 ? `${base}:v2` : base;
}

export function getMarketSecret(): string | null {
  const secret = process.env.MARKET_SEED_SECRET;
  if (secret) return secret.length >= 16 ? secret : null;
  // Credential rotation must never silently change active runs' future prices.
  return process.env.NODE_ENV === 'production' ? null : DEV_FALLBACK_SECRET;
}

/**
 * The seed the generator actually runs on. The player-visible game_seed stays
 * a shareable label, but the open-source generator plus a known seed would let
 * anyone compute tomorrow's prices, so the real input is keyed by a secret.
 */
export function deriveGenerationSeed(secret: string, mode: SessionGameMode, seed: string) {
  return createHmac('sha256', secret)
    .update(`${mode}:${seed}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();
}

let scriptCache: { loadedAt: number; script: MarketScript } | null = null;

async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

/** The shared infinite-mode script (stocks, 30 scripted days, their events). */
export async function loadMarketScript(admin: SupabaseClient): Promise<MarketScript> {
  if (scriptCache && Date.now() - scriptCache.loadedAt < SCRIPT_TTL_MS) return scriptCache.script;

  const [stocksResult, prices, events] = await Promise.all([
    admin.from('stocks').select('*').eq('is_active', true).order('symbol'),
    fetchAllPages((from, to) => admin
      .from('stock_prices')
      .select('id, game_day, open_price, high_price, low_price, close_price, volume, event_impact, stocks (symbol)')
      .gt('game_day', 0)
      .order('game_day')
      .order('id')
      .range(from, to)),
    fetchAllPages((from, to) => admin
      .from('market_events')
      .select(`
        id, event_key, game_day, source, headline, body, importance,
        category, is_accurate, is_rumor,
        event_stock_impacts (expected_impact, actual_impact, stocks (symbol))
      `)
      .order('game_day')
      .order('id')
      .range(from, to)),
  ]);
  if (stocksResult.error) throw stocksResult.error;

  const script: MarketScript = {
    stocks: (stocksResult.data ?? []) as DatabaseStock[],
    prices: prices as unknown as DatabasePrice[],
    events: events as unknown as DatabaseEvent[],
  };
  scriptCache = { loadedAt: Date.now(), script };
  return script;
}

/**
 * Last day a run generates from its plain, player-readable game_seed (BUG-006).
 * Legacy runs (market_seed_secret = false) keep the plain seed for the days
 * the player has already seen, so their history doesn't change. Infinite runs
 * chain each day off the stored previous close, so every later day can come
 * from the secret seed. A limited_30 run's prices are a function of the whole
 * seed, not chained, so a legacy 30-day run stays plain (it is unranked since
 * 202610060002).
 */
export function legacyPlainSeedThrough(
  session: Pick<MarketSession, 'market_seed_secret' | 'current_day'>,
  mode: SessionGameMode
) {
  if (session.market_seed_secret !== false) return 0;
  return mode === 'infinite' ? Math.max(1, session.current_day) : Infinity;
}

/** What the generator gets for a run; see marketEngine(). */
export async function scriptForRun(
  admin: SupabaseClient,
  mode: SessionGameMode,
  engine: number
): Promise<MarketScript> {
  if (mode !== 'infinite') return { stocks: [], prices: [], events: [] };
  const script = await loadMarketScript(admin);
  return engine >= 2 ? scriptlessRun(script) : script;
}

/** Keeps the stocks (listing prices, metadata); drops the shared days and news. */
export function scriptlessRun(script: MarketScript): MarketScript {
  return { stocks: script.stocks, prices: [], events: [] };
}

async function upsertInBatches(
  admin: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string
) {
  for (let start = 0; start < rows.length; start += UPSERT_BATCH) {
    const { error } = await admin
      .from(table)
      .upsert(rows.slice(start, start + UPSERT_BATCH), { onConflict });
    if (error) throw error;
  }
}

/**
 * Make sure the run's prices and news exist for every day up to `throughDay`.
 * Idempotent: generation is deterministic, so concurrent calls upsert the same
 * rows. Returns the day the market is generated through.
 */
export async function ensureMarketThrough(
  admin: SupabaseClient,
  session: MarketSession,
  throughDay: number,
  secret: string
): Promise<number> {
  const mode = normalizeMode(session.game_mode);
  const fingerprint = marketFingerprint(session);
  const target = clampRunDay(throughDay, mode);
  let generated = session.market_fingerprint === fingerprint
    ? session.market_generated_through ?? 0
    : 0;

  if (generated >= target) return generated;

  if (session.market_fingerprint !== fingerprint) {
    // Rows from another mode/seed (or from before fingerprints existed).
    for (const table of ['session_stock_prices', 'session_market_news']) {
      const { error } = await admin.from(table).delete().eq('session_id', session.id);
      if (error) throw error;
    }
    // Reset the counter too, or the forward-only update below would never
    // overwrite a stale, higher value.
    const { error: resetError } = await admin
      .from('game_sessions')
      .update({ market_generated_through: 0, market_fingerprint: fingerprint })
      .eq('id', session.id);
    if (resetError) throw resetError;
  }

  const plainSeed = session.game_seed ?? '';
  const secretSeed = deriveGenerationSeed(secret, mode, plainSeed);
  const plainThrough = legacyPlainSeedThrough(session, mode);
  let upgradedToSecret = false;
  const script = await scriptForRun(admin, mode, marketEngine(session));

  while (generated < target) {
    const fromDay = generated + 1;
    const usePlain = fromDay <= plainThrough;
    const toDay = Math.min(target, fromDay + CHUNK_DAYS - 1, usePlain ? plainThrough : Infinity);
    const seed = usePlain ? plainSeed : secretSeed;

    const previousCloses: Record<string, number> = {};
    if (fromDay > 1) {
      const { data, error } = await admin
        .from('session_stock_prices')
        .select('symbol, close_price')
        .eq('session_id', session.id)
        .eq('game_day', fromDay - 1);
      if (error) throw error;
      for (const row of data ?? []) previousCloses[row.symbol as string] = Number(row.close_price);
    }

    const priceRows = generateSessionPrices({ mode, seed, fromDay, toDay, script, previousCloses })
      .map((row) => ({ session_id: session.id, ...row }));
    const newsRows = [];
    for (let day = fromDay; day <= toDay; day += 1) {
      newsRows.push({
        session_id: session.id,
        game_day: day,
        items: generateSessionNews({ mode, seed, day, script }).map(sanitizeNews),
      });
    }

    await upsertInBatches(admin, 'session_stock_prices', priceRows, 'session_id,game_day,symbol');
    await upsertInBatches(admin, 'session_market_news', newsRows, 'session_id,game_day');

    const { error: markError } = await admin
      .from('game_sessions')
      .update({ market_generated_through: toDay, market_fingerprint: fingerprint })
      .eq('id', session.id)
      .lt('market_generated_through', toDay);
    if (markError) throw markError;

    if (!usePlain && session.market_seed_secret === false && !upgradedToSecret) {
      const { error: upgradeError } = await admin
        .from('game_sessions')
        .update({ market_seed_secret: true })
        .eq('id', session.id);
      if (upgradeError) throw upgradeError;
      upgradedToSecret = true;
    }

    generated = toDay;
  }

  return generated;
}

export async function loadOwnedSession(
  admin: SupabaseClient,
  sessionId: string,
  userId: string
): Promise<MarketSession | null> {
  const { data, error } = await admin
    .from('game_sessions')
    .select(SESSION_COLUMNS)
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...data, market_phase: data.market_phase ?? 'after_hours' } as MarketSession : null;
}
