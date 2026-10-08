import { Router } from 'express';
import { supabaseErrorResponse, supabaseHandler } from '../lib/supabaseServer';

const router = Router();

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

// POST /api/game/sync moved to marketRoutes.ts, where net worth is computed
// from stored prices instead of taken from the client.

export default router;
