-- V4-01 (bug hunt v4, 16 Nov 2026): anyone could list every profile photo.
--
-- The avatars bucket is public, so each photo loads from its own address
-- (/storage/v1/object/public/avatars/<user id>/avatar) without any policy.
-- "Avatar images are publicly readable" (202606240001) also gave SELECT on the
-- whole bucket to every role, visitors included. That only added listing: one
-- Storage API call with the key shipped in the site returned every
-- <user id>/avatar path, which are account ids next to profile photos.
--
-- Now a signed-in player can select only the files in their own folder. The
-- Profile page's upload (upsert) and remove calls need exactly that. Photos
-- still show everywhere by their public address, and the API's account
-- deletion uses the service role, so neither changes.
--
-- Test: supabase/tests/V4-01-avatars-rls.sql (begin ... rollback).

begin;

drop policy if exists "Avatar images are publicly readable" on storage.objects;

drop policy if exists "Users can read own avatar files" on storage.objects;
create policy "Users can read own avatar files"
on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
