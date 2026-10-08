-- StockPilot: the 2026-10-08 bug-hunt fixes, in one go.
-- Contains only 202610080002_bug_hunt_integrity_fixes.sql. The live database
-- already has everything through 202610080001 (run_all_2026-10-08.sql).
--
-- NOT included: 202610080003_gameplay_integrity.sql and
-- 202610080004_learning_and_account_breakdown.sql. They are not reconciled
-- with the server-authoritative market yet -- do not run them.
--
-- Paste the whole file into the Supabase SQL editor and run it ONCE.
-- One transaction: if any statement fails, nothing is applied. Rerunning it
-- is harmless (tested). Tested on a local Supabase Postgres built from all
-- migrations through 202610080001 plus test players.
--
-- Side effects on data (all intended):
--   * endless runs / slots on market engine 1 still inside the scripted days
--     become unranked (BUG-034);
--   * any profile avatar_url that is not the player's own uploaded avatar or
--     a Google account picture is cleared (BUG-018).
--
-- After it succeeds: push, then deploy the API server, then the client.
-- Generated file -- edit the migration, not this.

begin;

-- ── 1. BUG-004/034: engine-1 endless runs inside the public script ─────────
-- Engine 1 replays stock_prices (in the repo) for every scripted day, so a
-- run that has not passed the last scripted day can see its own future.
update public.game_sessions
set ranked = false
where game_mode = 'infinite'
  and market_engine < 2
  and ranked
  and current_day < (select coalesce(max(sp.game_day), 0) from public.stock_prices sp);

update public.save_slots
set ranked = false
where game_mode = 'infinite'
  and market_engine < 2
  and ranked
  and game_day < (select coalesce(max(sp.game_day), 0) from public.stock_prices sp);

-- ── 2. BUG-039: remember the mode a run was started in ──────────────────────
alter table public.game_sessions
  add column if not exists started_mode text
    check (started_mode in ('infinite', 'limited_30'));

-- Best available for old rows: a restored run may have switched mode, but the
-- cap only looks back 24 hours.
update public.game_sessions set started_mode = game_mode where started_mode is null;

-- Same as 202610060003 except started_mode is written and counted.
create or replace function public.start_new_game_with_mode(
  target_game_mode text default 'infinite'
)
returns public.game_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_session public.game_sessions%rowtype;
  selected_mode text;
  runs_today integer;
  run_cap integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  selected_mode := coalesce(nullif(target_game_mode, ''), 'infinite');

  if selected_mode not in ('infinite', 'limited_30') then
    raise exception 'Invalid game mode';
  end if;

  -- Serialises concurrent starts by the same player so the cap holds.
  perform pg_advisory_xact_lock(hashtextextended('start_new_game:' || auth.uid()::text, 0));

  run_cap := case selected_mode when 'limited_30' then 5 else 10 end;
  select count(*) into runs_today
  from public.game_sessions
  where user_id = auth.uid()
    and coalesce(started_mode, game_mode) = selected_mode
    and started_at > now() - interval '24 hours';

  if runs_today >= run_cap and exists (
    select 1 from public.game_sessions where user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'You can start % % runs per day. Try again tomorrow.',
      run_cap, case selected_mode when 'limited_30' then '30-day' else 'endless' end;
  end if;

  update public.game_sessions
  set status = 'paused', updated_at = now()
  where user_id = auth.uid()
    and status = 'active';

  insert into public.game_sessions (
    user_id,
    status,
    game_mode,
    started_mode,
    game_seed,
    current_day,
    starting_cash,
    cash_balance,
    portfolio_value,
    net_worth
  )
  values (
    auth.uid(),
    'active',
    selected_mode,
    selected_mode,
    public.random_market_seed(),
    1,
    2000,
    2000,
    0,
    2000
  )
  returning * into new_session;

  return new_session;
end;
$$;

revoke all on function public.start_new_game_with_mode(text) from public, anon;
grant execute on function public.start_new_game_with_mode(text) to authenticated;

-- ── 3. BUG-015: create_save_slot counts under a per-player lock ─────────────
-- Same as 202610060003 plus the advisory lock.
create or replace function public.create_save_slot(p_slot_name text default null)
returns public.save_slots
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.game_sessions%rowtype;
  slot_row public.save_slots%rowtype;
  snapshot jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  -- Two concurrent saves both counted 3 and both inserted.
  perform pg_advisory_xact_lock(hashtextextended('create_save_slot:' || auth.uid()::text, 0));

  if (select count(*) from public.save_slots where user_id = auth.uid()) >= 4 then
    raise exception 'Maximum 4 save slots reached';
  end if;

  select *
  into session_row
  from public.game_sessions
  where user_id = auth.uid() and status = 'active'
  order by updated_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No active game session';
  end if;

  perform public.recompute_session_value(session_row.id);
  select * into session_row from public.game_sessions where id = session_row.id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'symbol', st.symbol,
           'shares', h.quantity,
           'averageCost', h.average_purchase_price
         ) order by st.symbol), '[]'::jsonb)
  into snapshot
  from public.holdings h
  join public.stocks st on st.id = h.stock_id
  where h.session_id = session_row.id;

  insert into public.save_slots (
    user_id, slot_name, game_day, game_mode, game_seed,
    cash_balance, net_worth, holdings_snapshot, ranked, market_engine, unpaid_bills
  )
  values (
    auth.uid(),
    coalesce(nullif(left(trim(p_slot_name), 60), ''), 'Day ' || session_row.current_day || ' Run'),
    session_row.current_day,
    session_row.game_mode,
    session_row.game_seed,
    session_row.cash_balance,
    session_row.net_worth,
    snapshot,
    session_row.ranked,
    session_row.market_engine,
    session_row.unpaid_bills
  )
  returning * into slot_row;

  return slot_row;
end;
$$;

revoke all on function public.create_save_slot(text) from public, anon;
grant execute on function public.create_save_slot(text) to authenticated;

-- ── 4. restore_save_slot (BUG-004/034, BUG-036) ─────────────────────────────
-- Same as 202610080001 except keeps_rank and the streak reset.
create or replace function public.restore_save_slot(
  p_slot_id uuid
)
returns public.game_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  slot_row    public.save_slots%rowtype;
  session_row public.game_sessions%rowtype;
  h           jsonb;
  stock_id_   bigint;
  seen_day    integer;
  keeps_rank  boolean;
  regenerate  boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into slot_row
  from   public.save_slots
  where  id = p_slot_id and user_id = auth.uid();

  if not found then
    raise exception 'Save slot not found';
  end if;

  select * into session_row
  from   public.game_sessions
  where  user_id = auth.uid() and status = 'active'
  order  by updated_at desc
  limit  1
  for update;

  if not found then
    raise exception 'No active game session';
  end if;

  select max_day into seen_day
  from public.market_seed_progress
  where user_id = auth.uid()
    and game_mode = slot_row.game_mode
    and game_seed = slot_row.game_seed;

  -- The player has already seen this market past the slot's day (202610060002).
  keeps_rank := slot_row.ranked and slot_row.game_day >= coalesce(seen_day, 0);

  -- BUG-034: an engine-1 endless market replays the public script.
  if slot_row.market_engine < 2 and slot_row.game_mode = 'infinite' then
    keeps_rank := false;
  end if;

  -- Stored market rows belong to one mode + seed + engine. Same fingerprint:
  -- they are exactly what the generator would produce again, and rows past
  -- the restored day stay hidden by RLS. Otherwise the server regenerates --
  -- from the secret seed, so a legacy plain seed is never reused (BUG-006).
  regenerate := session_row.market_fingerprint is distinct from
    public.market_fingerprint_for(slot_row.game_mode, slot_row.game_seed, slot_row.market_engine);
  if regenerate then
    delete from public.session_stock_prices where session_id = session_row.id;
    delete from public.session_market_news where session_id = session_row.id;
    update public.game_sessions
    set market_generated_through = 0,
        market_fingerprint = null,
        market_seed_secret = true
    where id = session_row.id;
  end if;

  update public.game_sessions
  set    cash_balance    = slot_row.cash_balance,
         unpaid_bills    = slot_row.unpaid_bills,
         current_day     = slot_row.game_day,
         game_mode       = slot_row.game_mode,
         game_seed       = slot_row.game_seed,
         market_engine   = slot_row.market_engine,
         ranked          = keeps_rank,
         net_worth       = slot_row.net_worth,
         -- net_worth = cash + holdings - debt, floored at 0, so add the debt
         -- back; recompute_session_value below sets the exact value.
         portfolio_value = greatest(0, slot_row.net_worth - slot_row.cash_balance + slot_row.unpaid_bills),
         -- Rebase the bill clock onto the restored day (202608270001).
         bills_paid_through_day = greatest(0, floor(slot_row.game_day / 7.0)::integer * 7),
         -- BUG-036: a restored run starts fresh streaks; otherwise the
         -- streaks of the abandoned timeline carried into the loaded one.
         cash_discipline_streak = 0,
         hot_streak_days        = 0,
         streak_prev_net_worth  = slot_row.net_worth,
         streak_last_day        = slot_row.game_day,
         updated_at      = now()
  where  id = session_row.id;

  delete from public.holdings where session_id = session_row.id;

  for h in select * from jsonb_array_elements(slot_row.holdings_snapshot)
  loop
    select id into stock_id_ from public.stocks where symbol = (h->>'symbol');
    if found and (h->>'shares')::integer > 0 then
      insert into public.holdings(session_id, stock_id, quantity, average_purchase_price)
      values (
        session_row.id,
        stock_id_,
        (h->>'shares')::integer,
        (h->>'averageCost')::numeric
      );
    end if;
  end loop;

  perform public.recompute_session_value(session_row.id);

  select * into session_row from public.game_sessions where id = session_row.id;
  return session_row;
end;
$$;

revoke all on function public.restore_save_slot(uuid) from public, anon;
grant execute on function public.restore_save_slot(uuid) to authenticated;

-- ── 5. BUG-037: endless board = newest run, then ranked ─────────────────────
-- Same as 202610060002 except the ranked filter moves after distinct on.
create or replace function public.get_leaderboard(p_limit integer default 50)
returns table (
  user_id uuid,
  best_net_worth numeric,
  return_pct numeric,
  username text,
  display_name text,
  avatar_url text,
  total_xp bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with current_infinite_run as (
    select distinct on (gs.user_id)
      gs.user_id,
      gs.net_worth,
      gs.starting_cash,
      gs.ranked
    from public.game_sessions gs
    where gs.game_mode = 'infinite'
    order by gs.user_id, gs.started_at desc, gs.id desc
  )
  select
    run.user_id,
    run.net_worth,
    round((run.net_worth - run.starting_cash) / nullif(run.starting_cash, 0) * 100, 2),
    p.username,
    p.display_name,
    p.avatar_url,
    public.player_total_xp(run.user_id)
  from current_infinite_run run
  join public.profiles p on p.id = run.user_id
  where run.ranked
  order by run.net_worth desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.get_leaderboard(integer) from public, anon;
grant execute on function public.get_leaderboard(integer) to authenticated;

-- ── 6. BUG-017: daily goals only for the player's own run ───────────────────
drop policy if exists "Users own their daily goal completions" on public.user_daily_goal_completions;
create policy "Users own their daily goal completions"
  on public.user_daily_goal_completions for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.game_sessions gs
      where gs.id = session_id and gs.user_id = auth.uid()
    )
  );

-- ── 7. BUG-018: avatar_url only from our own storage (or Google sign-in) ────
-- The Profile page stores
--   <project>/storage/v1/object/public/avatars/<user id>/avatar?t=<ms>
-- and Google sign-in copies the account picture through handle_new_user().
-- Anything else (tracking pixels, other people's files) is refused.
create or replace function public.is_allowed_avatar_url(p_user_id uuid, p_url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_url is null
      or p_url ~ ('^https://oubvdzxoxektwtdmtbeg\.supabase\.co/storage/v1/object/public/avatars/'
                  || p_user_id::text || '/avatar(\?t=[0-9]+)?$')
      or p_url ~ '^https://lh[0-9]\.googleusercontent\.com/[A-Za-z0-9_./=-]+$';
$$;

-- Clear the ones that would fail, so the constraint can be validated.
update public.profiles
set avatar_url = null
where not public.is_allowed_avatar_url(id, avatar_url);

alter table public.profiles drop constraint if exists profiles_avatar_url_allowed;
alter table public.profiles
  add constraint profiles_avatar_url_allowed
  check (public.is_allowed_avatar_url(id, avatar_url));

-- Same as 202606240001 except a metadata avatar that fails the check is
-- dropped instead of failing the sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta_avatar text := nullif(new.raw_user_meta_data ->> 'avatar_url', '');
begin
  if not public.is_allowed_avatar_url(new.id, meta_avatar) then
    meta_avatar := null;
  end if;

  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, 'Player'), '@', 1)
    ),
    meta_avatar
  )
  on conflict (id) do update
  set
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

-- ── 8. BUG-021: pin the trigger function's search_path ──────────────────────
alter function public.trade_journal_lock_columns() set search_path = '';

commit;

-- Record this manual application so a later CLI push cannot replay it.
do $$
begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    insert into supabase_migrations.schema_migrations (version, name)
    values ('202610080002', 'bug_hunt_integrity_fixes')
    on conflict do nothing;
  end if;
end;
$$;

-- ── Checks (read-only; every row should say ok = true) ──────────────────────
select 'game_sessions.started_mode exists and is filled' as item,
       exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'game_sessions' and column_name = 'started_mode')
       and not exists (select 1 from public.game_sessions where started_mode is null) as ok
union all
select 'no ranked engine-1 endless run inside the script',
       not exists (select 1 from public.game_sessions
                   where game_mode = 'infinite' and market_engine < 2 and ranked
                     and current_day < (select coalesce(max(game_day), 0) from public.stock_prices))
union all
select 'avatar_url constraint validated',
       exists (select 1 from pg_constraint where conname = 'profiles_avatar_url_allowed' and convalidated)
union all
select 'restore_save_slot: engine-1 unrank + streak reset + debt fix',
       pg_get_functiondef('public.restore_save_slot(uuid)'::regprocedure) like '%slot_row.market_engine < 2%'
       and pg_get_functiondef('public.restore_save_slot(uuid)'::regprocedure) like '%cash_discipline_streak = 0%'
       and pg_get_functiondef('public.restore_save_slot(uuid)'::regprocedure) like '%+ slot_row.unpaid_bills)%'
union all
select 'create_save_slot locks before counting',
       pg_get_functiondef('public.create_save_slot(text)'::regprocedure) like '%create_save_slot:%'
union all
select 'start_new_game_with_mode counts started_mode',
       pg_get_functiondef('public.start_new_game_with_mode(text)'::regprocedure) like '%coalesce(started_mode, game_mode)%'
union all
select 'endless board filters ranked after distinct on',
       pg_get_functiondef('public.get_leaderboard(integer)'::regprocedure) like '%where run.ranked%'
union all
select 'daily-goal policy checks run ownership',
       (select with_check from pg_policies where tablename = 'user_daily_goal_completions'
          and policyname = 'Users own their daily goal completions') like '%game_sessions%'
union all
select 'trade_journal_lock_columns has search_path',
       (select proconfig @> array['search_path=""'] from pg_proc
        where oid = 'public.trade_journal_lock_columns()'::regprocedure)
union all
select 'grants unchanged (authenticated yes, anon no)',
       has_function_privilege('authenticated', 'public.restore_save_slot(uuid)', 'execute')
       and not has_function_privilege('anon', 'public.restore_save_slot(uuid)', 'execute')
       and has_function_privilege('authenticated', 'public.create_save_slot(text)', 'execute')
       and not has_function_privilege('anon', 'public.create_save_slot(text)', 'execute')
       and has_function_privilege('authenticated', 'public.get_leaderboard(integer)', 'execute')
       and not has_function_privilege('anon', 'public.get_leaderboard(integer)', 'execute')
       and not has_function_privilege('authenticated', 'public.server_advance_game_day(uuid, uuid, integer)', 'execute')
union all
select 'no player-callable advance_game_day',
       to_regprocedure('public.advance_game_day(uuid, integer, text)') is null;
