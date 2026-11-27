-- V4-01 check: nobody can list the avatars bucket except their own folder.
--
-- Paste into the Supabase SQL editor and run it as it is, before and after
-- 202611270001_avatars_owner_only_read.sql. It changes nothing: two fake file
-- rows for two made-up accounts exist only inside this transaction, and it
-- ends with ROLLBACK (no real files are touched, nothing is uploaded).
-- Every check prints NOTICE "PASS ..."; the first failure stops with
-- ERROR "FAIL ...". Before the migration it fails at the first check, and the
-- count it shows includes the bucket's real files.

begin;

insert into storage.objects (bucket_id, name, owner_id) values
  ('avatars', 'a0000000-0000-4000-8000-0000000000a1/avatar', 'a0000000-0000-4000-8000-0000000000a1'),
  ('avatars', 'b0000000-0000-4000-8000-0000000000b2/avatar', 'b0000000-0000-4000-8000-0000000000b2');

-- A visitor (the publishable key the site ships) lists nothing.
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
do $$
declare n integer;
begin
  select count(*) into n from storage.objects where bucket_id = 'avatars';
  if n <> 0 then
    raise exception 'FAIL V4-01: a visitor can list % avatar file(s)', n;
  end if;
  raise notice 'PASS V4-01: a visitor lists no avatar files';
end $$;
reset role;

-- Player A sees their own photo (upload with upsert and remove need it) and no one else's.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-0000000000a1', true);
do $$
declare own integer; others integer;
begin
  select count(*) filter (where name like 'a0000000-0000-4000-8000-0000000000a1/%'),
         count(*) filter (where name not like 'a0000000-0000-4000-8000-0000000000a1/%')
    into own, others
  from storage.objects where bucket_id = 'avatars';
  if others <> 0 then
    raise exception 'FAIL V4-01: player A can list % file(s) outside their own folder', others;
  end if;
  if own <> 1 then
    raise exception 'FAIL V4-01: player A cannot see their own avatar (re-upload would break)';
  end if;
  raise notice 'PASS V4-01: player A sees only their own avatar';
end $$;

-- Player B likewise.
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-0000000000b2","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-0000000000b2', true);
do $$
declare own integer; others integer;
begin
  select count(*) filter (where name like 'b0000000-0000-4000-8000-0000000000b2/%'),
         count(*) filter (where name not like 'b0000000-0000-4000-8000-0000000000b2/%')
    into own, others
  from storage.objects where bucket_id = 'avatars';
  if others <> 0 or own <> 1 then
    raise exception 'FAIL V4-01: player B sees % own and % other avatar file(s)', own, others;
  end if;
  raise notice 'PASS V4-01: player B sees only their own avatar';
end $$;
reset role;

-- The bucket stays public, so photos keep loading by their address.
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'avatars' and public) then
    raise exception 'FAIL V4-01: the avatars bucket is no longer public (photos would stop loading)';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd in ('SELECT', 'ALL')
      and qual like '%avatars%' and (roles && array['public', 'anon']::name[])
  ) then
    raise exception 'FAIL V4-01: a SELECT policy on avatars still covers visitors';
  end if;
  raise notice 'PASS V4-01: bucket public, no visitor SELECT policy';
end $$;

rollback;
