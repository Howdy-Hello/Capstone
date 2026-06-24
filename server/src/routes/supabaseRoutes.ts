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

router.delete('/account', supabaseHandler({ auth: 'user' }, async (_req, ctx) => {
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
    return Response.json({ message: deleteError.message }, { status: 500 });
  }

  return Response.json({ deleted: true });
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
