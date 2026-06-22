import { Router } from 'express';
import { supabaseHandler } from '../lib/supabaseServer';

const router = Router();

router.get('/health', supabaseHandler({ auth: 'none' }, async () => {
  return Response.json({ status: 'ok' });
}));

router.get('/me', supabaseHandler({ auth: 'user' }, async (_req, ctx) => {
  const userId = ctx.userClaims?.id;

  if (!userId) {
    return Response.json({ message: 'Missing user claims.' }, { status: 401 });
  }

  const { data, error } = await ctx.supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return Response.json({ message: error.message }, { status: 500 });
  }

  return Response.json({
    user: ctx.userClaims,
    profile: data,
  });
}));

router.get('/admin/profile-count', supabaseHandler({ auth: 'secret' }, async (_req, ctx) => {
  const { count, error } = await ctx.supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  if (error) {
    return Response.json({ message: error.message }, { status: 500 });
  }

  return Response.json({ count });
}));

export default router;
