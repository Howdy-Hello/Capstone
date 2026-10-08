import { getStocksForGameDay, normalizeMarketSeed } from '../market/mockStocks';
import { DatabasePrice, DatabaseStock, getHistoryForDatabaseStock } from '../market/databaseMarket';
import { Router } from 'express';
import { supabaseErrorResponse, supabaseHandler } from '../lib/supabaseServer';

const router = Router();

<<<<<<< HEAD
=======
// Gameplay writes are called frequently during a session, so this is generous —
// it only guards against runaway loops, not normal play.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  bucket: 'game-write',
  message: 'Too many game updates — slow down and try again shortly.',
});

>>>>>>> 607e372 (feat: add learning entries and account flows tracking)
export const DEFAULT_LEADERBOARD_LIMIT = 50;
export const MAX_LEADERBOARD_LIMIT = 100;

// Exported for unit tests. The null check is load-bearing: Number(null) is 0 and
// Number.isFinite(0) is true, so inspecting only the parsed value would treat an
// absent ?limit as a request for a single row.
export function resolveLeaderboardLimit(raw: string | null): number {
  if (raw === null || raw.trim() === '') return DEFAULT_LEADERBOARD_LIMIT;
  const requested = Number(raw);
  if (!Number.isFinite(requested)) return DEFAULT_LEADERBOARD_LIMIT;
  return Math.min(Math.max(1, Math.floor(requested)), MAX_LEADERBOARD_LIMIT);
}

// GET /api/leaderboard?limit=50 — ranked board for signed-in players (the page
// is behind ProtectedRoute and get_leaderboard is not granted to anon).
router.get('/leaderboard', supabaseHandler({ auth: 'user' }, async (req, ctx) => {
  const limit = resolveLeaderboardLimit(new URL(req.url).searchParams.get('limit'));

  const { data, error } = await ctx.supabaseAdmin.rpc('get_leaderboard', { p_limit: limit });
  if (error) return supabaseErrorResponse('GET /leaderboard', error);

  return Response.json({ leaderboard: data ?? [] });
}));

<<<<<<< HEAD
// POST /api/game/sync moved to marketRoutes.ts, where net worth is computed
// from stored prices instead of taken from the client.
=======
// The API derives quotes from persisted seed/mode/day, never from submitted wealth.
router.post('/game/sync', writeLimiter, validateBody({
  sessionId: { type: 'string', required: true, min: 1, max: 64 },
  day: { type: 'integer', min: 1, max: 10000 },
}), supabaseHandler({ auth: 'user' }, async (req, ctx) => {
  const { sessionId, day } = await req.json();
  const { data: session, error } = await ctx.supabase.from('game_sessions')
    .select('id,current_day,game_mode,game_seed').eq('id', sessionId).eq('status', 'active').single();
  if (error || !session) return Response.json({ message: 'Active session not found.' }, { status: 404 });
  const quoteDay = day ?? session.current_day;
  if (quoteDay < session.current_day || quoteDay > session.current_day + 1
      || (session.game_mode === 'limited_30' && quoteDay > 30)) {
    return Response.json({ message: 'Your game has changed. Reload before trying again.' }, { status: 409 });
  }
  let quotes: { symbol: string; price: number }[];
  const seed = normalizeMarketSeed(session.game_seed);
  if (session.game_mode === 'limited_30') {
    quotes = getStocksForGameDay(quoteDay, seed).map(s => ({ symbol: s.symbol, price: s.currentPrice }));
  } else {
    const { data: stocks, error: stockError } = await ctx.supabaseAdmin.from('stocks').select('*').eq('is_active', true);
    if (stockError) return supabaseErrorResponse('market stocks', stockError);
    // Page through the history; PostgREST's default row limit can truncate it.
    const prices: DatabasePrice[] = [];
    for (let start = 0; ; start += 1000) {
      const page = await ctx.supabaseAdmin.from('stock_prices')
        .select('id,game_day,open_price,high_price,low_price,close_price,volume,event_impact,stocks(symbol)')
        .gt('game_day', 0).order('game_day').order('id').range(start, start + 999);
      if (page.error) return supabaseErrorResponse('market history', page.error);
      prices.push(...page.data as unknown as DatabasePrice[]);
      if (page.data.length < 1000) break;
    }
    quotes = (stocks as DatabaseStock[]).map(stock => {
      const history = getHistoryForDatabaseStock(stock, prices, quoteDay, seed);
      return { symbol: stock.symbol, price: history[history.length - 1].closePrice };
    });
  }
  const saved = await ctx.supabaseAdmin.from('session_quotes').upsert(
    quotes.map(q => ({ session_id: sessionId, game_day: quoteDay, ...q })),
    { onConflict: 'session_id,game_day,symbol', ignoreDuplicates: true });
  if (saved.error) return supabaseErrorResponse('market quotes', saved.error);
  if (quoteDay === session.current_day) {
    const synced = await ctx.supabase.rpc('refresh_session_value', { target_session_id: sessionId });
    if (synced.error) return supabaseErrorResponse('session valuation', synced.error);
  }
  return Response.json({ ok: true });
}));
>>>>>>> 607e372 (feat: add learning entries and account flows tracking)

export default router;
