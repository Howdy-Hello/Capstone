import { Router } from 'express';
import { supabaseErrorResponse, supabaseHandler } from '../lib/supabaseServer';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

// Auth/account-sensitive endpoints get a tighter cap than the global limiter.
// (Primary auth — login/signup/reset — is handled by Supabase Auth, which has
// its own configurable rate limits.)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  bucket: 'auth',
  message: 'Too many account requests. Please wait a few minutes and try again.',
});

const deleteAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  bucket: 'account-delete',
  message: 'Too many account-deletion attempts. Please try again later.',
});

router.get('/health', supabaseHandler({ auth: 'none' }, async () => {
  return Response.json({ status: 'ok' });
}));

router.get('/me', authLimiter, supabaseHandler({ auth: 'user' }, async (_req, ctx) => {
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
    return supabaseErrorResponse('GET /me', error);
  }

  return Response.json({
    user: ctx.userClaims,
    profile: data,
  });
}));

router.delete('/account', deleteAccountLimiter, supabaseHandler({ auth: 'user' }, async (_req, ctx) => {
  const userId = ctx.userClaims?.id;

  if (!userId) {
    return Response.json({ message: 'Missing user claims.' }, { status: 401 });
  }

  const { data: avatarFiles, error: listError } = await ctx.supabaseAdmin.storage
    .from('avatars')
    .list(userId);

  if (listError) {
    return Response.json(
      { message: `Could not inspect avatar files: ${listError.message}` },
      { status: 500 }
    );
  }

  const avatarPaths = (avatarFiles ?? []).map((file) => `${userId}/${file.name}`);

  if (avatarPaths.length > 0) {
    const { error: removeError } = await ctx.supabaseAdmin.storage
      .from('avatars')
      .remove(avatarPaths);

    if (removeError) {
      return Response.json(
        { message: `Could not remove avatar files: ${removeError.message}` },
        { status: 500 }
      );
    }
  }

  const { error: deleteError } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId);

  if (deleteError) {
    return supabaseErrorResponse('DELETE /account', deleteError);
  }

  return Response.json({ deleted: true });
}));

router.get('/admin/profile-count', supabaseHandler({ auth: 'secret' }, async (_req, ctx) => {
  const { count, error } = await ctx.supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  if (error) {
    return supabaseErrorResponse('GET /admin/profile-count', error);
  }

  return Response.json({ count });
}));

export default router;
