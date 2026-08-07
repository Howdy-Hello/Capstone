import { Router } from 'express';
import { supabaseHandler } from '../lib/supabaseServer';
import { validateBody } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

// Gameplay writes are called frequently during a session, so this is generous —
// it only guards against runaway loops, not normal play.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  bucket: 'game-write',
  message: 'Too many game updates — slow down and try again shortly.',
});

const MODES = ['infinite', 'limited_30'] as const;

function normalizeMode(value: unknown): 'infinite' | 'limited_30' {
  return value === 'limited_30' ? 'limited_30' : 'infinite';
}

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

function normalizeDay(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

// GET /api/leaderboard?limit=50 — public ranked board from the persistent table.
router.get('/leaderboard', supabaseHandler({ auth: 'none' }, async (req, ctx) => {
  const limit = resolveLeaderboardLimit(new URL(req.url).searchParams.get('limit'));

  const { data, error } = await ctx.supabaseAdmin.rpc('get_leaderboard', { p_limit: limit });
  if (error) return Response.json({ message: error.message }, { status: 500 });

  return Response.json({ leaderboard: data ?? [] });
}));

// POST /api/leaderboard/submit  { netWorth, gameMode?, day? }
// Infinite mode records current net worth; 30-day mode retains the best finish.
router.post('/leaderboard/submit', writeLimiter, validateBody({
  netWorth: { type: 'number', required: true, min: 0, max: 1_000_000_000_000 },
  gameMode: { type: 'string', enum: MODES },
  day: { type: 'integer', min: 1 },
}), supabaseHandler({ auth: 'user' }, async (req, ctx) => {
  const body = await req.json().catch(() => ({}));
  const netWorth = Number(body?.netWorth);

  if (!Number.isFinite(netWorth)) {
    return Response.json({ message: 'netWorth must be a finite number.' }, { status: 400 });
  }

  const { data, error } = await ctx.supabase.rpc('record_leaderboard_score', {
    p_net_worth: netWorth,
    p_game_mode: normalizeMode(body?.gameMode),
    p_day: normalizeDay(body?.day),
  });

  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json({ entry: data });
}));

// POST /api/game/sync  { sessionId, portfolioValue, netWorth, gameMode?, day? }
// Persists a session's value to game_sessions (under the caller's RLS) and
// records the leaderboard score in one round-trip.
router.post('/game/sync', writeLimiter, validateBody({
  sessionId: { type: 'string', required: true, min: 1, max: 64 },
  portfolioValue: { type: 'number', required: true, min: 0, max: 1_000_000_000_000 },
  netWorth: { type: 'number', required: true, min: 0, max: 1_000_000_000_000 },
  gameMode: { type: 'string', enum: MODES },
  day: { type: 'integer', min: 1 },
}), supabaseHandler({ auth: 'user' }, async (req, ctx) => {
  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  const netWorth = Number(body?.netWorth);
  const portfolioValue = Number(body?.portfolioValue);

  if (!sessionId) {
    return Response.json({ message: 'sessionId is required.' }, { status: 400 });
  }
  if (!Number.isFinite(netWorth) || !Number.isFinite(portfolioValue)) {
    return Response.json(
      { message: 'netWorth and portfolioValue must be finite numbers.' },
      { status: 400 }
    );
  }

  // Select the affected rows back: under RLS an update against someone else's
  // (or a nonexistent) session matches nothing and reports no error, so without
  // this check the endpoint would answer ok:true having written nothing.
  const { data: updated, error: sessionError } = await ctx.supabase
    .from('game_sessions')
    .update({
      portfolio_value: Number(portfolioValue.toFixed(2)),
      net_worth: Number(netWorth.toFixed(2)),
    })
    .eq('id', sessionId)
    .select('id');

  if (sessionError) {
    return Response.json({ message: sessionError.message }, { status: 500 });
  }

  if (!updated || updated.length === 0) {
    return Response.json(
      { message: 'Session not found, or you do not have access to it.' },
      { status: 404 }
    );
  }

  const { data: entry, error: scoreError } = await ctx.supabase.rpc('record_leaderboard_score', {
    p_net_worth: netWorth,
    p_game_mode: normalizeMode(body?.gameMode),
    p_day: normalizeDay(body?.day),
  });

  if (scoreError) {
    return Response.json({ message: scoreError.message }, { status: 500 });
  }

  return Response.json({ ok: true, entry });
}));

export default router;
