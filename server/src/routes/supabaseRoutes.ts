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

const AVATAR_PAGE_SIZE = 100;

router.delete('/account', deleteAccountLimiter, supabaseHandler({ auth: 'user' }, async (_req, ctx) => {
  const userId = ctx.userClaims?.id;

  if (!userId) {
    return Response.json({ message: 'Missing user claims.' }, { status: 401 });
  }

  // list() returns at most `limit` entries, so page until a short page comes
  // back; otherwise a user with many uploads kept the rest after deletion.
  const avatarPaths: string[] = [];
  for (let offset = 0; ; offset += AVATAR_PAGE_SIZE) {
    const { data: avatarFiles, error: listError } = await ctx.supabaseAdmin.storage
      .from('avatars')
      .list(userId, { limit: AVATAR_PAGE_SIZE, offset });

    if (listError) {
      return supabaseErrorResponse('DELETE /account (list avatars)', listError);
    }

    avatarPaths.push(...(avatarFiles ?? []).map((file) => `${userId}/${file.name}`));
    if (!avatarFiles || avatarFiles.length < AVATAR_PAGE_SIZE) break;
  }

  for (let start = 0; start < avatarPaths.length; start += AVATAR_PAGE_SIZE) {
    const { error: removeError } = await ctx.supabaseAdmin.storage
      .from('avatars')
      .remove(avatarPaths.slice(start, start + AVATAR_PAGE_SIZE));

    if (removeError) {
      return supabaseErrorResponse('DELETE /account (remove avatars)', removeError);
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
