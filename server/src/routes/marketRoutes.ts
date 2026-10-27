import { Router } from 'express';
import { supabaseErrorResponse, supabaseHandler } from '../lib/supabaseServer';
import { userRateLimit } from '../middleware/rateLimit';
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

const marketLimiter = userRateLimit({
  windowMs: 60 * 1000,
  max: 120,
});

// Both budgets use the verified user id, so classmates sharing an IP do not
// consume each other's quota and changing IPs cannot bypass the limit.
const advancesPerUser = userRateLimit({ windowMs: 60 * 1000, max: 30 });

function marketLimitError(userId: string) {
  return marketLimiter(userId) ? null : Response.json({
    message: 'Too many game updates — slow down and try again shortly.',
  }, { status: 429 });
}

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
router.post('/game/market', supabaseHandler({ auth: 'user' }, async (req, ctx) => {
  const limited = marketLimitError(ctx.userClaims!.id);
  if (limited) return limited;
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
router.post('/game/advance', supabaseHandler({ auth: 'user' }, async (req, ctx) => {
  const limited = marketLimitError(ctx.userClaims!.id);
  if (limited) return limited;
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

function isMissingDbObject(error: { code?: string; message?: string }) {
  return ['PGRST202', 'PGRST205', '42883', '42P01'].includes(error.code ?? '')
    || /could not find the (function|table)|schema cache/i.test(error.message ?? '');
}

// POST /api/game/close  { sessionId, day }
// Closes the market and returns the day's news in one round trip, then builds
// tomorrow's market in the background so the next advance only moves the day.
// Tomorrow's rows stay hidden: RLS limits reads to the run's current day.
router.post('/game/close', supabaseHandler({ auth: 'user' }, async (req, ctx) => {
  const limited = marketLimitError(ctx.userClaims!.id);
  if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  if (!isUuid(body?.sessionId) || typeof body?.day !== 'number' || !Number.isInteger(body.day)) {
    return Response.json({ message: 'sessionId and day are required.' }, { status: 400 });
  }

  try {
    const session = await loadOwnedSession(ctx.supabaseAdmin, body.sessionId, ctx.userClaims!.id);
    if (!session || session.status !== 'active') {
      return Response.json({ message: 'Active session not found.' }, { status: 404 });
    }
    if (session.current_day !== body.day) {
      return Response.json({ message: 'Your game has changed. Reload before trying again.' }, { status: 409 });
    }

    // As the player, so close_market's own checks apply. Without the RPC the
    // phase is tracked in the browser, as the client did before this route.
    const { error: closeError } = await ctx.supabase.rpc('close_market', {
      target_session_id: session.id, target_game_day: body.day,
    });
    if (closeError && !isMissingDbObject(closeError)) {
      if (closeError.code === 'P0001') return Response.json({ message: closeError.message }, { status: 409 });
      return supabaseErrorResponse('POST /game/close', closeError);
    }

    const { data: newsRow, error: newsError } = await ctx.supabaseAdmin
      .from('session_market_news')
      .select('items')
      .eq('session_id', session.id)
      .eq('game_day', body.day)
      .maybeSingle();
    if (newsError) return supabaseErrorResponse('POST /game/close (news)', newsError);

    const secret = getMarketSecret();
    if (secret) {
      // Not awaited: the advance generates the day itself if this is still
      // running or failed, and both write the same rows with upserts.
      void ensureMarketThrough(ctx.supabaseAdmin, session, session.current_day + 1, secret)
        .catch((error) => console.error('[POST /game/close] Preparing the next day failed:', error));
    }

    return Response.json({ day: body.day, news: newsRow?.items ?? [] });
  } catch (error) {
    return supabaseErrorResponse('POST /game/close', error as { message?: string; code?: string });
  }
}));

// Kept so older clients don't 404. Values in the body are ignored: net worth
// is computed from stored prices now.
router.post('/game/sync', supabaseHandler({ auth: 'user' }, async (req, ctx) => {
  const limited = marketLimitError(ctx.userClaims!.id);
  if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  if (!isUuid(body?.sessionId)) {
    return Response.json({ message: 'sessionId must be a session id.' }, { status: 400 });
  }

  const { data, error } = await ctx.supabase.rpc('sync_session_value', { target_session_id: body.sessionId });
  if (error) return supabaseErrorResponse('POST /game/sync', error);
  return Response.json({ ok: true, netWorth: data });
}));

export default router;
