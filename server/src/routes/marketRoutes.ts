import { Router } from 'express';
import { supabaseErrorResponse, supabaseHandler } from '../lib/supabaseServer';
import { rateLimit, userRateLimit } from '../middleware/rateLimit';
import {
  ensureMarketThrough,
  getMarketSecret,
  loadOwnedSession,
  normalizeMode,
} from '../lib/marketService';
import { clampRunDay } from '../market/sessionMarket';

// The server owns each run's market: it generates prices and news, stores
// them, and is the only path that moves a run's day forward. The client reads
// the stored rows directly from Supabase (RLS limits them to the current day).

const router = Router();

const marketLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  bucket: 'game-market',
  message: 'Too many game updates — slow down and try again shortly.',
});

// BUG-009: the IP limit above is shared by a whole classroom and does nothing
// against one player on several IPs, so day advances are also capped per user.
const advancesPerUser = userRateLimit({ windowMs: 60 * 1000, max: 30 });

/** Largest single jump; bounds how much one request can ask the server to generate. */
export const MAX_ADVANCE_DAYS = 1;

function secretOrError() {
  const secret = getMarketSecret();
  if (!secret) {
    console.error('[market] No valid server-only market secret is configured; refusing to generate markets.');
  }
  return secret;
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Validate an advance request against the session. Exported for tests.
 * Returns the day to advance to, or an error message.
 */
export function resolveAdvanceTarget(
  currentDay: number,
  mode: string | null | undefined,
  requestedDay: unknown
): { day: number } | { error: string } {
  if (typeof requestedDay !== 'number' || !Number.isInteger(requestedDay)) {
    return { error: 'day must be an integer.' };
  }
  const day = clampRunDay(requestedDay, normalizeMode(mode));
  if (day < currentDay) return { error: 'The game day cannot move backwards.' };
  if (day - currentDay > MAX_ADVANCE_DAYS) {
    return { error: `You can advance at most ${MAX_ADVANCE_DAYS} days at once.` };
  }
  return { day };
}

// POST /api/game/market  { sessionId }
// Generates any missing days up to the run's current day (first load, legacy
// runs, restored saves) and refreshes the stored net worth.
router.post('/game/market', marketLimiter, supabaseHandler({ auth: 'user' }, async (req, ctx) => {
  const body = await req.json().catch(() => ({}));
  if (!isUuid(body?.sessionId)) {
    return Response.json({ message: 'sessionId must be a session id.' }, { status: 400 });
  }
  const secret = secretOrError();
  if (!secret) return Response.json({ message: 'Market generation is not configured.' }, { status: 503 });

  try {
    const session = await loadOwnedSession(ctx.supabaseAdmin, body.sessionId, ctx.userClaims!.id);
    if (!session) return Response.json({ message: 'Session not found.' }, { status: 404 });

    const generatedThrough = await ensureMarketThrough(ctx.supabaseAdmin, session, session.current_day, secret);
    const { data: netWorth, error } = await ctx.supabaseAdmin
      .rpc('recompute_session_value', { p_session_id: session.id });
    if (error) return supabaseErrorResponse('POST /game/market (value)', error);

    return Response.json({ currentDay: session.current_day, generatedThrough, netWorth });
  } catch (error) {
    return supabaseErrorResponse('POST /game/market', error as { message?: string; code?: string });
  }
}));

// POST /api/game/advance  { sessionId, day }
// Generates the market through `day`, then moves the run there and settles
// weekly living costs through the checked, user-scoped advance RPC.
router.post('/game/advance', marketLimiter, supabaseHandler({ auth: 'user' }, async (req, ctx) => {
  if (!advancesPerUser(ctx.userClaims!.id)) {
    return Response.json({ message: 'Too many day advances — slow down and try again shortly.' }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  if (!isUuid(body?.sessionId)) {
    return Response.json({ message: 'sessionId must be a session id.' }, { status: 400 });
  }
  const secret = secretOrError();
  if (!secret) return Response.json({ message: 'Market generation is not configured.' }, { status: 503 });

  try {
    const session = await loadOwnedSession(ctx.supabaseAdmin, body.sessionId, ctx.userClaims!.id);
    if (!session || session.status !== 'active') {
      return Response.json({ message: 'Active session not found.' }, { status: 404 });
    }

    const target = resolveAdvanceTarget(session.current_day, session.game_mode, body.day);
    if ('error' in target) return Response.json({ message: target.error }, { status: 400 });
    if (session.market_phase !== 'after_hours') {
      return Response.json({ message: 'Close the market before advancing.' }, { status: 409 });
    }

    await ensureMarketThrough(ctx.supabaseAdmin, session, target.day, secret);

    // Service role only: players cannot call this, so the day moves only
    // after the market above exists (202609250001).
    const { data, error } = await ctx.supabaseAdmin.rpc('server_advance_game_day', {
      p_user_id: ctx.userClaims!.id,
      p_session_id: session.id,
      p_target_day: target.day,
    });
    if (error) return supabaseErrorResponse('POST /game/advance', error);

    return Response.json(data);
  } catch (error) {
    return supabaseErrorResponse('POST /game/advance', error as { message?: string; code?: string });
  }
}));

// Kept so older clients don't 404. Values in the body are ignored: net worth
// is computed from stored prices now.
router.post('/game/sync', marketLimiter, supabaseHandler({ auth: 'user' }, async (req, ctx) => {
  const body = await req.json().catch(() => ({}));
  if (!isUuid(body?.sessionId)) {
    return Response.json({ message: 'sessionId must be a session id.' }, { status: 400 });
  }

  const { data, error } = await ctx.supabase.rpc('sync_session_value', { target_session_id: body.sessionId });
  if (error) return supabaseErrorResponse('POST /game/sync', error);
  return Response.json({ ok: true, netWorth: data });
}));

export default router;
