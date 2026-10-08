-- StockPilot: every migration the live database is missing, in one go.
-- Built 2026-10-08 from a read-only probe of the live schema:
--   * applied already (skipped): everything up to 202607190001, plus
--     202607300002, 202607310002, 202609030001, 202609030002
--   * missing tables/columns: 202607240003/4/5, 202607310003, 202608270002
--     (leaderboard_entries still exists), 202609250001 onward
--   * function-only migrations (202607240001/2/6, 202607300001,
--     202607310001, 202608270001, 202609180001) can't be probed; they are
--     replayed in order, which is harmless if they were applied before.
--
-- Paste the whole file into the Supabase SQL editor and run it ONCE.
-- One transaction: if any statement fails, nothing is applied.
-- Tested on a local Supabase Postgres rebuilt to the live state, both with
-- and without the function-only migrations applied. A second run fails
-- (leaderboard_entries is gone) and rolls back without changing anything.
--
-- After it succeeds: deploy the API server, then the client.
-- Generated file -- edit the migrations, not this.

begin;

-- 202608270002 drops leaderboard_entries (no reader since 202607240003).
-- Keep a copy, as that migration recommends.
do $$
begin
  if to_regclass('public.leaderboard_entries') is not null then
    create table if not exists public.leaderboard_entries_backup as
      select * from public.leaderboard_entries;
    revoke all on public.leaderboard_entries_backup from anon, authenticated;
  end if;
end;
$$;

-- The live leaderboard functions may already have the newer return shape from
-- 202607310001; replaying the older July versions over it would fail with
-- "cannot change return type". Drop them; the replay recreates both, ending
-- on the newest version with its grants.
drop function if exists public.get_leaderboard(integer);
drop function if exists public.get_30_day_leaderboard(integer);


-- ════════════════════════════════════════════════════════════════════════════
-- 202607240001_achievement_unlock_rates.sql
-- ════════════════════════════════════════════════════════════════════════════


-- Aggregate achievement popularity without exposing another user's unlocks.
create or replace function public.get_achievement_unlock_rates()
returns table (
  achievement_id text,
  unlock_count bigint,
  total_players bigint,
  unlock_percentage numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with player_total as (
    select count(*)::bigint as total_players
    from public.profiles
  )
  select
    unlocks.achievement_id,
    count(*)::bigint as unlock_count,
    player_total.total_players,
    case
      when player_total.total_players = 0 then 0::numeric
      else round(
        count(*)::numeric / player_total.total_players::numeric * 100,
        1
      )
    end as unlock_percentage
  from public.user_achievement_unlocks unlocks
  cross join player_total
  group by unlocks.achievement_id, player_total.total_players
  order by unlocks.achievement_id;
$$;

revoke all on function public.get_achievement_unlock_rates() from public;
grant execute on function public.get_achievement_unlock_rates() to authenticated;



-- ════════════════════════════════════════════════════════════════════════════
-- 202607240002_30_day_run_leaderboard.sql
-- ════════════════════════════════════════════════════════════════════════════


-- Rank individual completed 30-day attempts. Unlike the overall leaderboard,
-- repeat runs remain visible so players can compare their best finishes.
create or replace function public.get_30_day_leaderboard(p_limit integer default 50)
returns table (
  run_id uuid,
  user_id uuid,
  best_net_worth numeric,
  return_pct numeric,
  completed_at timestamptz,
  username text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    gs.id as run_id,
    gs.user_id,
    gs.net_worth as best_net_worth,
    round((gs.net_worth - gs.starting_cash) / nullif(gs.starting_cash, 0) * 100, 2) as return_pct,
    gs.updated_at as completed_at,
    p.username,
    p.display_name,
    p.avatar_url
  from public.game_sessions gs
  join public.profiles p on p.id = gs.user_id
  where gs.game_mode = 'limited_30'
    and gs.current_day = 30
  order by gs.net_worth desc, gs.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.get_30_day_leaderboard(integer) from public;
grant execute on function public.get_30_day_leaderboard(integer) to authenticated;



-- ════════════════════════════════════════════════════════════════════════════
-- 202607240003_daily_goal_completions.sql
-- ════════════════════════════════════════════════════════════════════════════


-- ── Daily goal completions ──────────────────────────────────────────────
-- useDailyGoals.ts previously persisted completions to localStorage only,
-- so progress didn't follow the player across devices/browsers. This table
-- mirrors user_achievement_unlocks: a per-user, per-(day,goal) completion
-- marker written by the client once a goal's progress hits 100%.

create table if not exists public.user_daily_goal_completions (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  game_day     integer     not null check (game_day >= 1),
  goal_id      text        not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, game_day, goal_id)
);

create index if not exists user_daily_goal_completions_user_idx
  on public.user_daily_goal_completions(user_id, game_day desc);

alter table public.user_daily_goal_completions enable row level security;

drop policy if exists "Users own their daily goal completions" on public.user_daily_goal_completions;
create policy "Users own their daily goal completions"
  on public.user_daily_goal_completions for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);



-- ════════════════════════════════════════════════════════════════════════════
-- 202607240004_user_stock_alerts.sql
-- ════════════════════════════════════════════════════════════════════════════


-- ── Stock price alerts ──────────────────────────────────────────────────
-- Lets a player set a price/percent-change threshold on a symbol and get a
-- toast notification when it's crossed. Alerts are one-shot: once triggered
-- they're marked inactive (active=false, triggered_at set) rather than
-- deleted, so a player can see their alert history if we surface it later.

create table if not exists public.user_stock_alerts (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  symbol       text        not null,
  condition    text        not null check (condition in ('price_above', 'price_below', 'pct_change_up', 'pct_change_down')),
  threshold    numeric(14,4) not null check (threshold >= 0),
  active       boolean     not null default true,
  created_at   timestamptz not null default now(),
  triggered_at timestamptz
);

create index if not exists user_stock_alerts_user_active_idx
  on public.user_stock_alerts(user_id, active, created_at desc);

alter table public.user_stock_alerts enable row level security;

drop policy if exists "Users own their stock alerts" on public.user_stock_alerts;
create policy "Users own their stock alerts"
  on public.user_stock_alerts for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);



-- ════════════════════════════════════════════════════════════════════════════
-- 202607240005_mission_completions.sql
-- ════════════════════════════════════════════════════════════════════════════


-- ── Beginner mission completions ────────────────────────────────────────
-- A one-time onboarding checklist (not daily-rotating, unlike daily goals)
-- guiding new players through the core loop. Mirrors user_achievement_unlocks.

create table if not exists public.user_mission_completions (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  mission_id   text        not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

alter table public.user_mission_completions enable row level security;

drop policy if exists "Users own their mission completions" on public.user_mission_completions;
create policy "Users own their mission completions"
  on public.user_mission_completions for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);



-- ════════════════════════════════════════════════════════════════════════════
-- 202607240006_infinite_current_leaderboard.sql
-- ════════════════════════════════════════════════════════════════════════════


-- Infinite rankings represent each player's latest infinite-run state, not the
-- highest value they have ever reached in any mode.
create or replace function public.get_leaderboard(p_limit integer default 50)
returns table (
  user_id uuid,
  best_net_worth numeric,
  return_pct numeric,
  username text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest_infinite_run as (
    select distinct on (gs.user_id)
      gs.user_id,
      gs.net_worth,
      gs.starting_cash
    from public.game_sessions gs
    where gs.game_mode = 'infinite'
    order by gs.user_id, gs.updated_at desc
  )
  select
    run.user_id,
    run.net_worth as best_net_worth,
    round(
      (run.net_worth - run.starting_cash)
      / nullif(run.starting_cash, 0)
      * 100,
      2
    ) as return_pct,
    p.username,
    p.display_name,
    p.avatar_url
  from latest_infinite_run run
  join public.profiles p on p.id = run.user_id
  order by run.net_worth desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to authenticated;



-- ════════════════════════════════════════════════════════════════════════════
-- 202607300001_infinite_live_net_worth.sql
-- ════════════════════════════════════════════════════════════════════════════


-- Infinite mode is a live ranking. A lower current value must replace a
-- player's previous value just as a higher one does.
create or replace function public.record_leaderboard_score(
  p_net_worth numeric,
  p_game_mode text default 'infinite',
  p_day       integer default null
)
returns public.leaderboard_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry      public.leaderboard_entries%rowtype;
  clean_nw   numeric(14,2);
  clean_mode text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_net_worth is null or p_net_worth <> p_net_worth
     or p_net_worth = 'infinity'::numeric
     or p_net_worth = '-infinity'::numeric then
    raise exception 'Invalid net worth';
  end if;

  clean_nw := round(
    greatest(0::numeric, least(p_net_worth, 1000000000000::numeric)),
    2
  );
  clean_mode := case
    when p_game_mode = 'limited_30' then 'limited_30'
    else 'infinite'
  end;

  insert into public.leaderboard_entries (
    user_id, best_net_worth, best_return_pct, game_mode, best_day, updated_at
  )
  values (
    auth.uid(),
    clean_nw,
    round((clean_nw - 2000.0) / 2000.0 * 100, 2),
    clean_mode,
    p_day,
    now()
  )
  on conflict (user_id) do update
  set best_net_worth = case
        when excluded.game_mode = 'infinite'
          then excluded.best_net_worth
        else greatest(
          public.leaderboard_entries.best_net_worth,
          excluded.best_net_worth
        )
      end,
      best_return_pct = round(
        (
          case
            when excluded.game_mode = 'infinite'
              then excluded.best_net_worth
            else greatest(
              public.leaderboard_entries.best_net_worth,
              excluded.best_net_worth
            )
          end - 2000.0
        ) / 2000.0 * 100,
        2
      ),
      game_mode = excluded.game_mode,
      best_day = excluded.best_day,
      updated_at = now()
  returning * into entry;

  return entry;
end;
$$;

revoke all on function public.record_leaderboard_score(numeric, text, integer)
from public;
grant execute on function public.record_leaderboard_score(numeric, text, integer)
to authenticated;

-- Read the newest infinite run itself instead of an accumulated/high-water
-- score. The session's net_worth is kept current by the game sync endpoint.
create or replace function public.get_leaderboard(p_limit integer default 50)
returns table (
  user_id uuid,
  best_net_worth numeric,
  return_pct numeric,
  username text,
  display_name text,
  avatar_url text
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
      gs.starting_cash
    from public.game_sessions gs
    where gs.game_mode = 'infinite'
    order by gs.user_id, gs.started_at desc, gs.id desc
  )
  select
    run.user_id,
    run.net_worth as best_net_worth,
    round(
      (run.net_worth - run.starting_cash)
      / nullif(run.starting_cash, 0)
      * 100,
      2
    ) as return_pct,
    p.username,
    p.display_name,
    p.avatar_url
  from current_infinite_run run
  join public.profiles p on p.id = run.user_id
  order by run.net_worth desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to authenticated;



-- ════════════════════════════════════════════════════════════════════════════
-- 202607310001_leaderboard_player_levels.sql
-- ════════════════════════════════════════════════════════════════════════════


create or replace function public.player_total_xp(target_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(
    case unlocks.achievement_id
      when 'first_trade' then 100
      when 'risk_taker' then 300
      when 'active_trader' then 450
      when 'diversified' then 500
      when 'sector_scout' then 400
      when 'watchlist_builder' then 150
      when 'cash_builder' then 250
      when 'market_regular' then 125
      when 'closing_bell' then 600
      when 'smart_investor' then 250
      when 'cash_discipline' then 350
      when 'hot_streak' then 500
      when 'market_master' then 750
      else 0
    end
  ), 0)::bigint
  from public.user_achievement_unlocks unlocks
  where unlocks.user_id = target_user_id;
$$;

drop function if exists public.get_leaderboard(integer);

create function public.get_leaderboard(p_limit integer default 50)
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
      gs.starting_cash
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
  order by run.net_worth desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

drop function if exists public.get_30_day_leaderboard(integer);

create function public.get_30_day_leaderboard(p_limit integer default 50)
returns table (
  run_id uuid,
  user_id uuid,
  best_net_worth numeric,
  return_pct numeric,
  completed_at timestamptz,
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
  select
    gs.id,
    gs.user_id,
    gs.net_worth,
    round((gs.net_worth - gs.starting_cash) / nullif(gs.starting_cash, 0) * 100, 2),
    gs.updated_at,
    p.username,
    p.display_name,
    p.avatar_url,
    public.player_total_xp(gs.user_id)
  from public.game_sessions gs
  join public.profiles p on p.id = gs.user_id
  where gs.game_mode = 'limited_30'
    and gs.current_day = 30
  order by gs.net_worth desc, gs.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.player_total_xp(uuid) from public;
revoke all on function public.get_leaderboard(integer) from public;
revoke all on function public.get_30_day_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to authenticated;
grant execute on function public.get_30_day_leaderboard(integer) to authenticated;



-- ════════════════════════════════════════════════════════════════════════════
-- 202607310003_stock_alert_ath_atl.sql
-- ════════════════════════════════════════════════════════════════════════════


-- ── All-time high/low stock alerts ──────────────────────────────────────
-- Extends user_stock_alerts to support "new all-time high" / "new all-time
-- low" conditions alongside the existing price/percent-change conditions.

alter table public.user_stock_alerts
  drop constraint if exists user_stock_alerts_condition_check;

alter table public.user_stock_alerts
  add constraint user_stock_alerts_condition_check
  check (condition in (
    'price_above', 'price_below', 'pct_change_up', 'pct_change_down',
    'new_all_time_high', 'new_all_time_low'
  ));



-- ════════════════════════════════════════════════════════════════════════════
-- 202608270001_restore_save_slot_bill_clock.sql
-- ════════════════════════════════════════════════════════════════════════════


-- Restoring a save left the weekly-bill clock untouched.
--
-- restore_save_slot rewinds current_day (and cash, mode, seed, holdings) but
-- never touched game_sessions.bills_paid_through_day. advance_game_day bills
-- `floor(next_day / 7) - floor(bills_paid_through_day / 7)` cycles at $350
-- each, so the next day advance after a restore settled every week between the
-- stale clock and the restored day in one lump:
--
--   * Load a day-90 save into a session whose clock sat at 0 and the next
--     advance charges floor(90/7) = 12 cycles = $4,200 against the cash the
--     slot just restored -- money the original run had already paid.
--   * In the other direction, loading an early save into a far-along session
--     left the clock ahead of the restored day, so every replayed week was
--     rent-free until play passed the old high-water mark.
--
-- The slot's cash_balance already reflects the bills the original run paid up
-- to slot.game_day, so the correct clock for a restored session is the last
-- completed cycle at or before that day. save_slots does not record the
-- original clock, and this is exactly what advance_game_day itself stores
-- (next_paid_through = floor(next_day / 7) * 7), so the two agree.
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

  update public.game_sessions
  set    cash_balance    = slot_row.cash_balance,
         current_day     = slot_row.game_day,
         game_mode       = slot_row.game_mode,
         game_seed       = slot_row.game_seed,
         net_worth       = slot_row.net_worth,
         portfolio_value = slot_row.net_worth - slot_row.cash_balance,
         -- Rebase the bill clock onto the restored day (see header).
         bills_paid_through_day = greatest(0, floor(slot_row.game_day / 7.0)::integer * 7),
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

  select * into session_row from public.game_sessions where id = session_row.id;
  return session_row;
end;
$$;

revoke all on function public.restore_save_slot(uuid)
from public;
grant execute on function public.restore_save_slot(uuid)
to authenticated;



-- ════════════════════════════════════════════════════════════════════════════
-- 202608270002_drop_dead_leaderboard_objects.sql
-- ════════════════════════════════════════════════════════════════════════════


-- Remove database objects nothing reads any more.
--
-- 1. leaderboard_entries + record_leaderboard_score
--    Both leaderboards moved onto game_sessions in 202607240003 /
--    202607310001: get_leaderboard reads the newest infinite session's
--    net_worth, and get_30_day_leaderboard reads limited_30 sessions sitting on
--    day 30. Nothing has read leaderboard_entries since. record_leaderboard_score
--    kept writing to it on every trade and every day advance -- a write per
--    sync, feeding a table with no readers.
--
--    !! This DROPs a table that holds rows. Nothing displays them and nothing
--    has since 202607240003, but the delete is irreversible. To keep a copy,
--    run this first, outside the migration:
--        create table public.leaderboard_entries_backup as
--          select * from public.leaderboard_entries;
--
-- 2. start_new_game()
--    Superseded by start_new_game_with_mode(text) in 202607080001. The no-arg
--    version has had no caller since.
--
-- Deliberately NOT dropped: set_updated_at() and handle_new_user(). They look
-- unreferenced because no application code names them, but they back five
-- updated_at triggers and the auth.users -> profiles signup trigger.

drop function if exists public.record_leaderboard_score(numeric, text, integer);
drop table    if exists public.leaderboard_entries;
drop function if exists public.start_new_game();



-- ════════════════════════════════════════════════════════════════════════════
-- 202609180001_reduce_weekly_living_expenses.sql
-- ════════════════════════════════════════════════════════════════════════════

-- Reduce weekly living expenses from $350 to $100.

create or replace function public.advance_game_day(
  target_session_id uuid,
  target_game_day integer,
  target_game_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.game_sessions%rowtype;
  next_day integer;
  due_cycles integer;
  bill_total numeric(14, 2);
  amount_paid numeric(14, 2);
  next_paid_through integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target_game_mode not in ('infinite', 'limited_30') then
    raise exception 'Invalid game mode';
  end if;

  next_day := greatest(1, target_game_day);
  if target_game_mode = 'limited_30' then
    next_day := least(30, next_day);
  end if;

  select *
  into session_row
  from public.game_sessions
  where id = target_session_id
    and user_id = auth.uid()
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active game session not found';
  end if;

  due_cycles := greatest(
    0,
    floor(next_day / 7.0)::integer
      - floor(session_row.bills_paid_through_day / 7.0)::integer
  );
  bill_total := due_cycles * 100.00;
  amount_paid := least(session_row.cash_balance, bill_total);
  next_paid_through := case
    when due_cycles > 0 then floor(next_day / 7.0)::integer * 7
    else session_row.bills_paid_through_day
  end;

  update public.game_sessions
  set current_day = next_day,
      game_mode = target_game_mode,
      cash_balance = cash_balance - amount_paid,
      bills_paid_through_day = next_paid_through,
      updated_at = now()
  where id = target_session_id;

  return jsonb_build_object(
    'day', next_day,
    'cash', session_row.cash_balance - amount_paid,
    'cycles_charged', due_cycles,
    'bill_total', bill_total,
    'amount_paid', amount_paid,
    'shortfall', bill_total - amount_paid,
    'bills_paid_through_day', next_paid_through
  );
end;
$$;

revoke all on function public.advance_game_day(uuid, integer, text) from public;
grant execute on function public.advance_game_day(uuid, integer, text) to authenticated;



-- ════════════════════════════════════════════════════════════════════════════
-- 202609250001_server_authoritative_market.sql
-- ════════════════════════════════════════════════════════════════════════════

-- Server-authoritative market data.
--
-- Until now every price a player saw was regenerated in the browser from the
-- run's seed, and the browser also wrote cash, holdings and net worth straight
-- into game_sessions/holdings. That meant (1) any change to the generator code
-- silently rewrote the history of every existing run, and (2) nothing a player
-- reported -- trade prices, cash, net worth, hence the leaderboards -- could be
-- trusted.
--
-- From here on the API server (server/src/routes/marketRoutes.ts) generates
-- each run's prices and news with a secret-derived seed and stores them in
-- session_stock_prices / session_market_news. Trades are priced from those
-- rows, the day only moves forward through the server, and players can read
-- their session data but no longer write it directly.
--
-- Deploy order: apply this migration, deploy the API server with
-- MARKET_SEED_SECRET set, then deploy the client with REACT_APP_API_URL set.

-- ── 1. Per-run market storage ────────────────────────────────────────────────

alter table public.game_sessions
  add column if not exists market_generated_through integer not null default 0
    check (market_generated_through >= 0),
  -- "<mode>:<seed>" the stored rows were generated for. A save-slot restore
  -- that changes either one invalidates them.
  add column if not exists market_fingerprint text,
  -- New runs generate from a secret-keyed seed (see marketService.ts) so the
  -- visible game_seed cannot be used to compute future prices. Runs that
  -- already exist keep generating from their plain seed so their markets don't
  -- change underneath the players.
  add column if not exists market_seed_secret boolean not null default false;

alter table public.game_sessions
  alter column market_seed_secret set default true;

create table if not exists public.session_stock_prices (
  session_id   uuid          not null references public.game_sessions(id) on delete cascade,
  game_day     integer       not null check (game_day >= 1),
  symbol       text          not null,
  open_price   numeric(12,2) not null check (open_price > 0),
  high_price   numeric(12,2) not null check (high_price > 0),
  low_price    numeric(12,2) not null check (low_price > 0),
  close_price  numeric(12,2) not null check (close_price > 0),
  volume       bigint        not null default 0 check (volume >= 0),
  event_impact numeric(10,6) not null default 0,
  primary key (session_id, game_day, symbol)
);

create table if not exists public.session_market_news (
  session_id uuid    not null references public.game_sessions(id) on delete cascade,
  game_day   integer not null check (game_day >= 1),
  -- Sanitized for the player: no exact impacts, no rumor verdicts.
  items      jsonb   not null default '[]'::jsonb,
  primary key (session_id, game_day)
);

alter table public.session_stock_prices enable row level security;
alter table public.session_market_news enable row level security;

-- Players see their own run up to its current day. Rows past current_day can
-- exist after a save-slot restore rewinds the day; they stay hidden.
drop policy if exists "Players read own run prices" on public.session_stock_prices;
create policy "Players read own run prices"
on public.session_stock_prices for select to authenticated
using (
  exists (
    select 1 from public.game_sessions s
    where s.id = session_stock_prices.session_id
      and s.user_id = (select auth.uid())
      and session_stock_prices.game_day <= s.current_day
  )
);

drop policy if exists "Players read own run news" on public.session_market_news;
create policy "Players read own run news"
on public.session_market_news for select to authenticated
using (
  exists (
    select 1 from public.game_sessions s
    where s.id = session_market_news.session_id
      and s.user_id = (select auth.uid())
      and session_market_news.game_day <= s.current_day
  )
);

-- Only the API server (service role, which bypasses RLS) writes these.
revoke insert, update, delete on public.session_stock_prices from anon, authenticated;
revoke insert, update, delete on public.session_market_news from anon, authenticated;

-- ── 2. Players can read, not write, their session state ─────────────────────

drop policy if exists "Users manage own sessions" on public.game_sessions;
drop policy if exists "Users read own sessions" on public.game_sessions;
create policy "Users read own sessions"
on public.game_sessions for select to authenticated
using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.game_sessions from anon, authenticated;

drop policy if exists "Users insert own holdings" on public.holdings;
drop policy if exists "Users update own holdings" on public.holdings;
drop policy if exists "Users delete own holdings" on public.holdings;
revoke insert, update, delete on public.holdings from anon, authenticated;

drop policy if exists "Users insert own trades" on public.trades;
revoke insert, update, delete on public.trades from anon, authenticated;

-- Save slots are restored into cash and holdings, so a player-written slot was
-- a way to set any balance. Slots are now snapshotted by create_save_slot().
drop policy if exists "Users own their save slots" on public.save_slots;
drop policy if exists "Users read own save slots" on public.save_slots;
drop policy if exists "Users delete own save slots" on public.save_slots;
create policy "Users read own save slots"
on public.save_slots for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Users delete own save slots"
on public.save_slots for delete to authenticated
using ((select auth.uid()) = user_id);
revoke insert, update on public.save_slots from anon, authenticated;

-- The shared infinite-mode script is now only an input to the server's
-- generator. Readable, it told players the first 30 days in advance.
drop policy if exists "Authenticated users can read stock prices" on public.stock_prices;
drop policy if exists "Public can read stock prices" on public.stock_prices;
drop policy if exists "Authenticated users can read market events" on public.market_events;
drop policy if exists "Public can read market events" on public.market_events;
drop policy if exists "Authenticated users can read event impacts" on public.event_stock_impacts;
drop policy if exists "Public can read event impacts" on public.event_stock_impacts;

-- ── 3. Session value, computed from stored prices ───────────────────────────

create or replace function public.recompute_session_value(p_session_id uuid)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  holdings_value numeric(14, 2);
  next_net_worth numeric(14, 2);
begin
  -- Falls back to cost basis for a holding whose price row is missing (e.g.
  -- right after a restore, before the server has regenerated the market).
  select coalesce(sum(h.quantity * coalesce(p.close_price, h.average_purchase_price)), 0)
  into holdings_value
  from public.holdings h
  join public.stocks st on st.id = h.stock_id
  join public.game_sessions gs on gs.id = h.session_id
  left join public.session_stock_prices p
    on p.session_id = h.session_id
   and p.symbol = st.symbol
   and p.game_day = gs.current_day
  where h.session_id = p_session_id;

  update public.game_sessions
  set portfolio_value = round(holdings_value, 2),
      net_worth = round(cash_balance + holdings_value, 2),
      updated_at = now()
  where id = p_session_id
  returning net_worth into next_net_worth;

  return next_net_worth;
end;
$$;

-- Supabase grants EXECUTE on new functions to anon and authenticated by
-- default, so revoking from public alone would leave them callable.
revoke all on function public.recompute_session_value(uuid) from public, anon, authenticated;
grant execute on function public.recompute_session_value(uuid) to service_role;

-- Client-callable refresh (replaces the old client-written net_worth sync).
create or replace function public.sync_session_value(target_session_id uuid)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.game_sessions
    where id = target_session_id and user_id = auth.uid()
  ) then
    raise exception 'Game session not found';
  end if;

  return public.recompute_session_value(target_session_id);
end;
$$;

revoke all on function public.sync_session_value(uuid) from public, anon;
grant execute on function public.sync_session_value(uuid) to authenticated;

-- ── 4. Trades priced from the stored market ─────────────────────────────────
-- Same signature, so existing callers keep working, but target_price and
-- target_game_day are ignored: the price is today's stored close with the
-- anti-snowball slippage from client/src/data/tradingState.ts applied, and
-- the day is the session's own. (The old version also wrote current_day from
-- the caller's argument, which let a trade move the day.)
create or replace function public.execute_trade(
  target_session_id uuid,
  target_symbol text,
  target_trade_type text,
  target_price numeric,
  target_game_day integer,
  target_quantity integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.game_sessions%rowtype;
  stock_row public.stocks%rowtype;
  holding_row public.holdings%rowtype;
  base_price numeric(12, 2);
  holdings_value numeric(14, 2);
  net_worth_before numeric(14, 2);
  trade_ratio numeric;
  slippage numeric := 0;
  fill_price numeric;
  next_cash numeric(14, 2);
  next_quantity integer;
  next_average numeric(12, 2);
  trade_total numeric(14, 2);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target_trade_type not in ('buy', 'sell') then
    raise exception 'Trade type must be buy or sell';
  end if;

  if target_quantity is null or target_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select *
  into session_row
  from public.game_sessions
  where id = target_session_id
    and user_id = auth.uid()
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active game session not found';
  end if;

  select *
  into stock_row
  from public.stocks
  where symbol = upper(target_symbol)
    and is_active = true;

  if not found then
    raise exception 'Stock not found';
  end if;

  select close_price
  into base_price
  from public.session_stock_prices
  where session_id = target_session_id
    and game_day = session_row.current_day
    and symbol = stock_row.symbol;

  if base_price is null then
    raise exception 'Market data for this day is not ready yet';
  end if;

  select coalesce(sum(h.quantity * coalesce(p.close_price, h.average_purchase_price)), 0)
  into holdings_value
  from public.holdings h
  join public.stocks st on st.id = h.stock_id
  left join public.session_stock_prices p
    on p.session_id = h.session_id
   and p.symbol = st.symbol
   and p.game_day = session_row.current_day
  where h.session_id = target_session_id;

  net_worth_before := session_row.cash_balance + holdings_value;

  -- getTradeSlippage: free up to 15% of net worth, then 0.55 per unit of
  -- excess ratio, capped at 12%.
  if net_worth_before > 0 then
    trade_ratio := (base_price * target_quantity) / net_worth_before;
    if trade_ratio > 0.15 then
      slippage := least(0.12, (trade_ratio - 0.15) * 0.55);
    end if;
  end if;

  fill_price := case
    when target_trade_type = 'buy' then base_price * (1 + slippage)
    else base_price * (1 - slippage)
  end;
  trade_total := round(fill_price * target_quantity, 2);

  select *
  into holding_row
  from public.holdings
  where session_id = target_session_id
    and stock_id = stock_row.id
  for update;

  if target_trade_type = 'buy' then
    if session_row.cash_balance < trade_total then
      raise exception 'Not enough cash';
    end if;

    next_cash := session_row.cash_balance - trade_total;
    next_quantity := coalesce(holding_row.quantity, 0) + target_quantity;
    next_average := round(
      (
        coalesce(holding_row.average_purchase_price * holding_row.quantity, 0)
        + trade_total
      ) / next_quantity,
      2
    );

    insert into public.holdings (
      session_id,
      stock_id,
      quantity,
      average_purchase_price
    )
    values (
      target_session_id,
      stock_row.id,
      next_quantity,
      next_average
    )
    on conflict (session_id, stock_id) do update
    set
      quantity = excluded.quantity,
      average_purchase_price = excluded.average_purchase_price,
      updated_at = now();
  else
    if holding_row.id is null or holding_row.quantity < target_quantity then
      raise exception 'Not enough shares';
    end if;

    next_cash := session_row.cash_balance + trade_total;
    next_quantity := holding_row.quantity - target_quantity;
    next_average := holding_row.average_purchase_price;

    if next_quantity = 0 then
      delete from public.holdings where id = holding_row.id;
    else
      update public.holdings
      set quantity = next_quantity, updated_at = now()
      where id = holding_row.id;
    end if;
  end if;

  update public.game_sessions
  set cash_balance = next_cash,
      updated_at = now()
  where id = target_session_id;

  insert into public.trades (
    session_id,
    user_id,
    stock_id,
    game_day,
    trade_type,
    quantity,
    price_per_share
  )
  values (
    target_session_id,
    auth.uid(),
    stock_row.id,
    session_row.current_day,
    target_trade_type,
    target_quantity,
    round(fill_price, 2)
  );

  perform public.recompute_session_value(target_session_id);

  return jsonb_build_object(
    'cash', next_cash,
    'symbol', stock_row.symbol,
    'quantity', next_quantity,
    'average_purchase_price', next_average,
    'price', round(fill_price, 4),
    'total', trade_total,
    'game_day', session_row.current_day
  );
end;
$$;

revoke all on function public.execute_trade(uuid, text, text, numeric, integer, integer) from public, anon;
grant execute on function public.execute_trade(uuid, text, text, numeric, integer, integer) to authenticated;

-- ── 5. Day advance: server only, forward only ───────────────────────────────
-- The client-callable advance_game_day let a player move the day without the
-- market being generated, and backwards to replay days whose prices it had
-- already seen.
drop function if exists public.advance_game_day(uuid, integer, text);

create or replace function public.server_advance_game_day(
  p_user_id uuid,
  p_session_id uuid,
  p_target_day integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.game_sessions%rowtype;
  next_day integer;
  due_cycles integer;
  bill_total numeric(14, 2);
  amount_paid numeric(14, 2);
  next_paid_through integer;
  next_net_worth numeric(14, 2);
begin
  select *
  into session_row
  from public.game_sessions
  where id = p_session_id
    and user_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active game session not found';
  end if;

  next_day := greatest(1, p_target_day);
  if session_row.game_mode = 'limited_30' then
    next_day := least(30, next_day);
  end if;

  if next_day < session_row.current_day then
    raise exception 'The game day cannot move backwards';
  end if;

  if session_row.market_generated_through < next_day then
    raise exception 'Market data for day % has not been generated', next_day;
  end if;

  -- Weekly living costs: $100 per completed 7-day cycle (202609180001).
  due_cycles := greatest(
    0,
    floor(next_day / 7.0)::integer
      - floor(session_row.bills_paid_through_day / 7.0)::integer
  );
  bill_total := due_cycles * 100.00;
  amount_paid := least(session_row.cash_balance, bill_total);
  next_paid_through := case
    when due_cycles > 0 then floor(next_day / 7.0)::integer * 7
    else session_row.bills_paid_through_day
  end;

  update public.game_sessions
  set current_day = next_day,
      cash_balance = cash_balance - amount_paid,
      bills_paid_through_day = next_paid_through,
      updated_at = now()
  where id = p_session_id;

  next_net_worth := public.recompute_session_value(p_session_id);

  return jsonb_build_object(
    'day', next_day,
    'cash', session_row.cash_balance - amount_paid,
    'net_worth', next_net_worth,
    'cycles_charged', due_cycles,
    'bill_total', bill_total,
    'amount_paid', amount_paid,
    'shortfall', bill_total - amount_paid,
    'bills_paid_through_day', next_paid_through
  );
end;
$$;

revoke all on function public.server_advance_game_day(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.server_advance_game_day(uuid, uuid, integer) to service_role;

-- ── 6. New runs get a server-chosen seed ────────────────────────────────────
-- Previously the client picked the seed afterwards, and infinite runs reused
-- the last one, so a restarted run replayed a market the player had seen.
create or replace function public.random_market_seed()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::integer, 1),
    ''
  )
  from generate_series(1, 6);
$$;

revoke all on function public.random_market_seed() from public, anon, authenticated;

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
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  selected_mode := coalesce(nullif(target_game_mode, ''), 'infinite');

  if selected_mode not in ('infinite', 'limited_30') then
    raise exception 'Invalid game mode';
  end if;

  update public.game_sessions
  set status = 'paused', updated_at = now()
  where user_id = auth.uid()
    and status = 'active';

  insert into public.game_sessions (
    user_id,
    status,
    game_mode,
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

-- ── 7. Save slots snapshotted server-side ───────────────────────────────────

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
    cash_balance, net_worth, holdings_snapshot
  )
  values (
    auth.uid(),
    coalesce(nullif(left(trim(p_slot_name), 60), ''), 'Day ' || session_row.current_day || ' Run'),
    session_row.current_day,
    session_row.game_mode,
    session_row.game_seed,
    session_row.cash_balance,
    session_row.net_worth,
    snapshot
  )
  returning * into slot_row;

  return slot_row;
end;
$$;

revoke all on function public.create_save_slot(text) from public, anon;
grant execute on function public.create_save_slot(text) to authenticated;

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

  -- Stored market rows belong to one mode + seed. Same fingerprint: they are
  -- exactly what the generator would produce again, and rows past the restored
  -- day stay hidden by RLS. Different fingerprint: throw them away so the
  -- server regenerates the slot's market.
  if session_row.market_fingerprint is distinct from (slot_row.game_mode || ':' || slot_row.game_seed) then
    delete from public.session_stock_prices where session_id = session_row.id;
    delete from public.session_market_news where session_id = session_row.id;
    update public.game_sessions
    set market_generated_through = 0,
        market_fingerprint = null
    where id = session_row.id;
  end if;

  update public.game_sessions
  set    cash_balance    = slot_row.cash_balance,
         current_day     = slot_row.game_day,
         game_mode       = slot_row.game_mode,
         game_seed       = slot_row.game_seed,
         net_worth       = slot_row.net_worth,
         portfolio_value = slot_row.net_worth - slot_row.cash_balance,
         -- Rebase the bill clock onto the restored day (202608270001).
         bills_paid_through_day = greatest(0, floor(slot_row.game_day / 7.0)::integer * 7),
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

-- ── 8. Spending cash (advisor hires) ────────────────────────────────────────
-- Can only lower the balance, so it needs no further validation.
create or replace function public.spend_session_cash(
  target_session_id uuid,
  p_amount numeric
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_cash numeric(14, 2);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  update public.game_sessions
  set cash_balance = cash_balance - round(p_amount, 2),
      updated_at = now()
  where id = target_session_id
    and user_id = auth.uid()
    and status = 'active'
    and cash_balance >= round(p_amount, 2)
  returning cash_balance into next_cash;

  if not found then
    raise exception 'Not enough cash';
  end if;

  perform public.recompute_session_value(target_session_id);
  return next_cash;
end;
$$;

revoke all on function public.spend_session_cash(uuid, numeric) from public, anon;
grant execute on function public.spend_session_cash(uuid, numeric) to authenticated;

-- ── 9. Close default anon grants on earlier functions ───────────────────────
-- Earlier migrations revoked EXECUTE only from public, but Supabase's default
-- privileges grant it to anon and authenticated directly, so the anon key
-- could still read every player's name and net worth, and call the internal
-- XP helpers for any user id.
revoke execute on function public.player_total_xp(uuid) from anon, authenticated;
revoke execute on function public.player_level_from_xp(bigint) from anon, authenticated;
revoke execute on function public.get_leaderboard(integer) from anon;
revoke execute on function public.get_30_day_leaderboard(integer) from anon;
revoke execute on function public.get_achievement_unlock_rates() from anon;
revoke execute on function public.process_level_cash_rewards(uuid) from anon;



-- ════════════════════════════════════════════════════════════════════════════
-- 202609250002_daily_goals_per_run.sql
-- ════════════════════════════════════════════════════════════════════════════

-- Daily goal completions were keyed by (user, game_day, goal) only, so a new
-- run showed the previous run's goals for the same day number as already done.
-- Completions now belong to a run. Existing rows can't be attributed to one,
-- and goals only affect the goal widget (not XP or cash), so they are cleared.

delete from public.user_daily_goal_completions;

alter table public.user_daily_goal_completions
  add column if not exists session_id uuid not null
    references public.game_sessions(id) on delete cascade;

alter table public.user_daily_goal_completions
  drop constraint if exists user_daily_goal_completions_pkey;

alter table public.user_daily_goal_completions
  add primary key (user_id, session_id, game_day, goal_id);

drop index if exists public.user_daily_goal_completions_user_idx;
create index if not exists user_daily_goal_completions_session_idx
  on public.user_daily_goal_completions(session_id, game_day);



-- ════════════════════════════════════════════════════════════════════════════
-- 202610060001_lock_profile_rewards_and_achievements.sql
-- ════════════════════════════════════════════════════════════════════════════

-- Closes two cash/XP exploits found in the 2026-10-06 bug hunt.
--
-- BUG-001: the profiles UPDATE policy only checked auth.uid() = id, with no
-- column limit, so a player could reset last_level_reward_processed to 1 and
-- call process_level_cash_rewards again -- unlimited cash, repeatable forever.
--
-- BUG-003: user_achievement_unlocks was writable by its owner ("for all"), so
-- a player could insert every achievement id, which feeds player_total_xp ->
-- levels -> level cash rewards and both leaderboards. Unlocks now go through
-- claim_achievements(), which checks each condition against server state, and
-- the two streak achievements are awarded by the day advance itself.
--
-- Rows forged before this migration cannot be told apart from real ones and
-- are left in place.


-- ── 1. profiles: players may only write their own profile fields ───────────
-- Column privileges, not RLS, decide which columns a statement may touch.
-- Profile.tsx upserts (INSERT ... ON CONFLICT DO UPDATE), and PostgREST puts
-- every payload column, id included, in the SET list, so both lists need id.
-- The RLS policies still pin id to auth.uid().
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, username, display_name, bio, avatar_url, updated_at)
  on public.profiles to authenticated;
grant update (id, username, display_name, bio, avatar_url, updated_at)
  on public.profiles to authenticated;

-- ── 2. user_achievement_unlocks: read and delete only ───────────────────────
-- Junk ids earned no XP (player_total_xp maps them to 0) but polluted the
-- unlock-rate statistics.
delete from public.user_achievement_unlocks
where achievement_id not in (
  'first_trade', 'risk_taker', 'active_trader', 'diversified', 'sector_scout',
  'watchlist_builder', 'cash_builder', 'market_regular', 'closing_bell',
  'smart_investor', 'cash_discipline', 'hot_streak', 'market_master'
);

alter table public.user_achievement_unlocks
  drop constraint if exists user_achievement_unlocks_known_id,
  add constraint user_achievement_unlocks_known_id check (achievement_id in (
    'first_trade', 'risk_taker', 'active_trader', 'diversified', 'sector_scout',
    'watchlist_builder', 'cash_builder', 'market_regular', 'closing_bell',
    'smart_investor', 'cash_discipline', 'hot_streak', 'market_master'
  ));

drop policy if exists "Users own their achievement unlocks" on public.user_achievement_unlocks;
drop policy if exists "Users read own achievement unlocks" on public.user_achievement_unlocks;
create policy "Users read own achievement unlocks"
on public.user_achievement_unlocks for select to authenticated
using ((select auth.uid()) = user_id);

-- Deleting only lowers XP; level rewards already paid stay processed.
drop policy if exists "Users delete own achievement unlocks" on public.user_achievement_unlocks;
create policy "Users delete own achievement unlocks"
on public.user_achievement_unlocks for delete to authenticated
using ((select auth.uid()) = user_id);

revoke insert, update on public.user_achievement_unlocks from anon, authenticated;

-- ── 3. Streak counters, kept by the server per run ──────────────────────────
-- Same rule as the client's nextStreakState (useAchievements.ts): one step
-- per advance; a run whose day went backwards (restore) starts a fresh streak.
alter table public.game_sessions
  add column if not exists cash_discipline_streak integer not null default 0,
  add column if not exists hot_streak_days integer not null default 0,
  add column if not exists streak_prev_net_worth numeric(14, 2) not null default 2000,
  add column if not exists streak_last_day integer not null default 0;

create or replace function public.server_advance_game_day(
  p_user_id uuid,
  p_session_id uuid,
  p_target_day integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.game_sessions%rowtype;
  next_day integer;
  due_cycles integer;
  bill_total numeric(14, 2);
  amount_paid numeric(14, 2);
  next_paid_through integer;
  next_net_worth numeric(14, 2);
  next_cash numeric(14, 2);
  stale_streak boolean;
  next_cash_streak integer;
  next_hot_streak integer;
begin
  select *
  into session_row
  from public.game_sessions
  where id = p_session_id
    and user_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active game session not found';
  end if;

  next_day := greatest(1, p_target_day);
  if session_row.game_mode = 'limited_30' then
    next_day := least(30, next_day);
  end if;

  if next_day < session_row.current_day then
    raise exception 'The game day cannot move backwards';
  end if;

  if session_row.market_generated_through < next_day then
    raise exception 'Market data for day % has not been generated', next_day;
  end if;

  -- Weekly living costs: $100 per completed 7-day cycle (202609180001).
  due_cycles := greatest(
    0,
    floor(next_day / 7.0)::integer
      - floor(session_row.bills_paid_through_day / 7.0)::integer
  );
  bill_total := due_cycles * 100.00;
  amount_paid := least(session_row.cash_balance, bill_total);
  next_paid_through := case
    when due_cycles > 0 then floor(next_day / 7.0)::integer * 7
    else session_row.bills_paid_through_day
  end;

  update public.game_sessions
  set current_day = next_day,
      cash_balance = cash_balance - amount_paid,
      bills_paid_through_day = next_paid_through,
      updated_at = now()
  where id = p_session_id;

  next_net_worth := public.recompute_session_value(p_session_id);
  next_cash := session_row.cash_balance - amount_paid;

  if next_day > session_row.current_day then
    stale_streak := session_row.streak_last_day > session_row.current_day;
    if stale_streak then
      session_row.cash_discipline_streak := 0;
      session_row.hot_streak_days := 0;
      session_row.streak_prev_net_worth := session_row.net_worth;
    end if;

    next_cash_streak := case
      when next_net_worth > 0 and next_cash / next_net_worth >= 0.20
        then session_row.cash_discipline_streak + 1
      else 0
    end;
    next_hot_streak := case
      when next_net_worth > session_row.streak_prev_net_worth
        then session_row.hot_streak_days + 1
      else 0
    end;

    update public.game_sessions
    set cash_discipline_streak = next_cash_streak,
        hot_streak_days = next_hot_streak,
        streak_prev_net_worth = next_net_worth,
        streak_last_day = next_day
    where id = p_session_id;

    if next_cash_streak >= 5 then
      insert into public.user_achievement_unlocks (user_id, achievement_id)
      values (p_user_id, 'cash_discipline')
      on conflict do nothing;
    end if;
    if next_hot_streak >= 3 then
      insert into public.user_achievement_unlocks (user_id, achievement_id)
      values (p_user_id, 'hot_streak')
      on conflict do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'day', next_day,
    'cash', next_cash,
    'net_worth', next_net_worth,
    'cycles_charged', due_cycles,
    'bill_total', bill_total,
    'amount_paid', amount_paid,
    'shortfall', bill_total - amount_paid,
    'bills_paid_through_day', next_paid_through
  );
end;
$$;

revoke all on function public.server_advance_game_day(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.server_advance_game_day(uuid, uuid, integer) to service_role;

-- ── 4. claim_achievements: unlock only what the server can verify ───────────
-- Conditions mirror DEFS in client/src/hooks/useAchievements.ts. Returns the
-- ids the player now holds out of the ones asked for.
create or replace function public.claim_achievements(
  target_session_id uuid,
  p_achievement_ids text[]
)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  session_row public.game_sessions%rowtype;
  trade_count integer;
  held_count integer;
  sector_count integer;
  watch_count integer;
  live_net_worth numeric(14, 2);
  wanted text;
  earned boolean;
  granted text[] := '{}';
begin
  if caller is null then
    raise exception 'Authentication required';
  end if;

  select *
  into session_row
  from public.game_sessions
  where id = target_session_id
    and user_id = caller;

  if not found then
    raise exception 'Game session not found';
  end if;

  select count(*) into trade_count
  from public.trades where user_id = caller;

  select count(*), count(distinct st.sector)
  into held_count, sector_count
  from public.holdings h
  join public.stocks st on st.id = h.stock_id
  where h.session_id = target_session_id
    and h.quantity > 0;

  select count(*) into watch_count
  from public.user_watchlist where user_id = caller;

  live_net_worth := public.recompute_session_value(target_session_id);

  foreach wanted in array coalesce(p_achievement_ids, '{}') loop
    earned := case wanted
      when 'first_trade'       then trade_count >= 1
      when 'active_trader'     then trade_count >= 10
      when 'risk_taker'        then held_count >= 3
      when 'diversified'       then held_count >= 5
      when 'sector_scout'      then sector_count >= 3
      when 'watchlist_builder' then watch_count >= 3
      when 'cash_builder'      then session_row.cash_balance >= 5000
      when 'market_regular'    then session_row.current_day >= 5
      when 'closing_bell'      then session_row.current_day >= 30
      when 'smart_investor'    then live_net_worth >= 15000
      when 'market_master'     then live_net_worth >= 50000
      when 'cash_discipline'   then session_row.cash_discipline_streak >= 5
      when 'hot_streak'        then session_row.hot_streak_days >= 3
      else false
    end;

    if earned then
      insert into public.user_achievement_unlocks (user_id, achievement_id)
      values (caller, wanted)
      on conflict do nothing;
    end if;

    if earned or exists (
      select 1 from public.user_achievement_unlocks
      where user_id = caller and achievement_id = wanted
    ) then
      granted := array_append(granted, wanted);
    end if;
  end loop;

  return granted;
end;
$$;

revoke all on function public.claim_achievements(uuid, text[]) from public, anon;
grant execute on function public.claim_achievements(uuid, text[]) to authenticated;



-- ════════════════════════════════════════════════════════════════════════════
-- 202610060002_ranked_runs_and_seeded_infinite.sql
-- ════════════════════════════════════════════════════════════════════════════

-- Leaderboard integrity, from the 2026-10-06 bug hunt.
--
-- BUG-002: restoring a save rewinds the day but keeps the run's market, so a
-- player could play ahead, note every close, load an earlier save and trade
-- with perfect knowledge. Loading stays allowed (it's a feature), but a run
-- loaded from before the furthest day the player has already reached on that
-- market is no longer ranked.
--
-- BUG-004: every infinite run replayed the same 30 scripted days, whose
-- prices are in the repo. Runs started from here on use market engine 2: only
-- the listing prices come from the script, everything after is generated from
-- the run's own secret seed (server/src/lib/marketService.ts).
--
-- BUG-005: sessions and save slots written by the client before 202609250001
-- could hold any cash balance. They stay playable but are no longer ranked.
--
-- Deploy order: this migration, then the API server, then the client.


-- ── 1. Columns ──────────────────────────────────────────────────────────────

alter table public.game_sessions
  add column if not exists ranked boolean not null default true,
  add column if not exists market_engine smallint not null default 1
    check (market_engine in (1, 2));
alter table public.game_sessions alter column market_engine set default 2;

alter table public.save_slots
  add column if not exists ranked boolean not null default true,
  add column if not exists market_engine smallint not null default 1
    check (market_engine in (1, 2));
alter table public.save_slots alter column market_engine set default 2;

-- Furthest day each player has reached on each market. Kept outside
-- game_sessions because a restore overwrites a session's seed and day.
create table if not exists public.market_seed_progress (
  user_id   uuid    not null references auth.users(id) on delete cascade,
  game_mode text    not null,
  game_seed text    not null,
  max_day   integer not null default 1 check (max_day >= 1),
  primary key (user_id, game_mode, game_seed)
);

alter table public.market_seed_progress enable row level security;
revoke all on public.market_seed_progress from anon, authenticated;

-- ── 2. Backfill ─────────────────────────────────────────────────────────────

-- BUG-005: market_seed_secret = false marks every run that existed before
-- 202609250001, i.e. the era when the browser wrote cash and holdings.
update public.game_sessions
set ranked = false
where market_seed_secret = false;

-- Slots older than the first server-era run may have been written by the
-- browser; so may any slot saved from a legacy run.
update public.save_slots slot
set ranked = false
where slot.created_at < coalesce(
        (select min(gs.started_at) from public.game_sessions gs where gs.market_seed_secret),
        'infinity'::timestamptz)
   or exists (
        select 1 from public.game_sessions gs
        where gs.user_id = slot.user_id
          and gs.game_mode = slot.game_mode
          and gs.game_seed = slot.game_seed
          and gs.market_seed_secret = false);

insert into public.market_seed_progress (user_id, game_mode, game_seed, max_day)
select user_id, game_mode, game_seed, max(day)
from (
  select user_id, game_mode, game_seed, current_day as day
  from public.game_sessions where game_seed is not null
  union all
  select user_id, game_mode, game_seed, game_day
  from public.save_slots where game_seed is not null
) seen
group by user_id, game_mode, game_seed
on conflict (user_id, game_mode, game_seed)
do update set max_day = greatest(public.market_seed_progress.max_day, excluded.max_day);

-- ── 3. Fingerprint shared with the API server ───────────────────────────────
-- Must match marketFingerprint() in server/src/lib/marketService.ts.
create or replace function public.market_fingerprint_for(
  p_mode text, p_seed text, p_engine smallint
)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_mode, 'infinite') || ':' || coalesce(p_seed, '')
    || case when coalesce(p_engine, 1) >= 2 then ':v2' else '' end;
$$;

revoke all on function public.market_fingerprint_for(text, text, smallint) from public, anon, authenticated;

-- ── 4. Day advance records how far each market has been played ──────────────
-- Same as 202610060001 plus the market_seed_progress upsert.
create or replace function public.server_advance_game_day(
  p_user_id uuid,
  p_session_id uuid,
  p_target_day integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.game_sessions%rowtype;
  next_day integer;
  due_cycles integer;
  bill_total numeric(14, 2);
  amount_paid numeric(14, 2);
  next_paid_through integer;
  next_net_worth numeric(14, 2);
  next_cash numeric(14, 2);
  stale_streak boolean;
  next_cash_streak integer;
  next_hot_streak integer;
begin
  select *
  into session_row
  from public.game_sessions
  where id = p_session_id
    and user_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active game session not found';
  end if;

  next_day := greatest(1, p_target_day);
  if session_row.game_mode = 'limited_30' then
    next_day := least(30, next_day);
  end if;

  if next_day < session_row.current_day then
    raise exception 'The game day cannot move backwards';
  end if;

  if session_row.market_generated_through < next_day then
    raise exception 'Market data for day % has not been generated', next_day;
  end if;

  -- Weekly living costs: $100 per completed 7-day cycle (202609180001).
  due_cycles := greatest(
    0,
    floor(next_day / 7.0)::integer
      - floor(session_row.bills_paid_through_day / 7.0)::integer
  );
  bill_total := due_cycles * 100.00;
  amount_paid := least(session_row.cash_balance, bill_total);
  next_paid_through := case
    when due_cycles > 0 then floor(next_day / 7.0)::integer * 7
    else session_row.bills_paid_through_day
  end;

  update public.game_sessions
  set current_day = next_day,
      cash_balance = cash_balance - amount_paid,
      bills_paid_through_day = next_paid_through,
      updated_at = now()
  where id = p_session_id;

  next_net_worth := public.recompute_session_value(p_session_id);
  next_cash := session_row.cash_balance - amount_paid;

  if session_row.game_seed is not null then
    insert into public.market_seed_progress (user_id, game_mode, game_seed, max_day)
    values (p_user_id, session_row.game_mode, session_row.game_seed, next_day)
    on conflict (user_id, game_mode, game_seed)
    do update set max_day = greatest(public.market_seed_progress.max_day, excluded.max_day);
  end if;

  if next_day > session_row.current_day then
    stale_streak := session_row.streak_last_day > session_row.current_day;
    if stale_streak then
      session_row.cash_discipline_streak := 0;
      session_row.hot_streak_days := 0;
      session_row.streak_prev_net_worth := session_row.net_worth;
    end if;

    next_cash_streak := case
      when next_net_worth > 0 and next_cash / next_net_worth >= 0.20
        then session_row.cash_discipline_streak + 1
      else 0
    end;
    next_hot_streak := case
      when next_net_worth > session_row.streak_prev_net_worth
        then session_row.hot_streak_days + 1
      else 0
    end;

    update public.game_sessions
    set cash_discipline_streak = next_cash_streak,
        hot_streak_days = next_hot_streak,
        streak_prev_net_worth = next_net_worth,
        streak_last_day = next_day
    where id = p_session_id;

    if next_cash_streak >= 5 then
      insert into public.user_achievement_unlocks (user_id, achievement_id)
      values (p_user_id, 'cash_discipline')
      on conflict do nothing;
    end if;
    if next_hot_streak >= 3 then
      insert into public.user_achievement_unlocks (user_id, achievement_id)
      values (p_user_id, 'hot_streak')
      on conflict do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'day', next_day,
    'cash', next_cash,
    'net_worth', next_net_worth,
    'cycles_charged', due_cycles,
    'bill_total', bill_total,
    'amount_paid', amount_paid,
    'shortfall', bill_total - amount_paid,
    'bills_paid_through_day', next_paid_through
  );
end;
$$;

revoke all on function public.server_advance_game_day(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.server_advance_game_day(uuid, uuid, integer) to service_role;

-- ── 5. Save slots carry the run's ranking and engine ────────────────────────

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
    cash_balance, net_worth, holdings_snapshot, ranked, market_engine
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
    session_row.market_engine
  )
  returning * into slot_row;

  return slot_row;
end;
$$;

revoke all on function public.create_save_slot(text) from public, anon;
grant execute on function public.create_save_slot(text) to authenticated;

-- ── 6. Restore: playable always, ranked only without hindsight ──────────────

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

  -- The player has already seen this market past the slot's day.
  keeps_rank := slot_row.ranked and slot_row.game_day >= coalesce(seen_day, 0);

  -- Stored market rows belong to one mode + seed + engine. Same fingerprint:
  -- they are exactly what the generator would produce again, and rows past
  -- the restored day stay hidden by RLS. Otherwise the server regenerates.
  if session_row.market_fingerprint is distinct from
     public.market_fingerprint_for(slot_row.game_mode, slot_row.game_seed, slot_row.market_engine) then
    delete from public.session_stock_prices where session_id = session_row.id;
    delete from public.session_market_news where session_id = session_row.id;
    update public.game_sessions
    set market_generated_through = 0,
        market_fingerprint = null
    where id = session_row.id;
  end if;

  update public.game_sessions
  set    cash_balance    = slot_row.cash_balance,
         current_day     = slot_row.game_day,
         game_mode       = slot_row.game_mode,
         game_seed       = slot_row.game_seed,
         market_engine   = slot_row.market_engine,
         ranked          = keeps_rank,
         net_worth       = slot_row.net_worth,
         portfolio_value = slot_row.net_worth - slot_row.cash_balance,
         -- Rebase the bill clock onto the restored day (202608270001).
         bills_paid_through_day = greatest(0, floor(slot_row.game_day / 7.0)::integer * 7),
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

-- ── 7. Leaderboards rank only ranked runs ───────────────────────────────────
-- Same as 202607310001 plus the ranked filter. The infinite board shows each
-- player's newest *ranked* infinite run.

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
      gs.starting_cash
    from public.game_sessions gs
    where gs.game_mode = 'infinite'
      and gs.ranked
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
  order by run.net_worth desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

create or replace function public.get_30_day_leaderboard(p_limit integer default 50)
returns table (
  run_id uuid,
  user_id uuid,
  best_net_worth numeric,
  return_pct numeric,
  completed_at timestamptz,
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
  select
    gs.id,
    gs.user_id,
    gs.net_worth,
    round((gs.net_worth - gs.starting_cash) / nullif(gs.starting_cash, 0) * 100, 2),
    gs.updated_at,
    p.username,
    p.display_name,
    p.avatar_url,
    public.player_total_xp(gs.user_id)
  from public.game_sessions gs
  join public.profiles p on p.id = gs.user_id
  where gs.game_mode = 'limited_30'
    and gs.current_day = 30
    and gs.ranked
  order by gs.net_worth desc, gs.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.get_leaderboard(integer) from public, anon;
revoke all on function public.get_30_day_leaderboard(integer) from public, anon;
grant execute on function public.get_leaderboard(integer) to authenticated;
grant execute on function public.get_30_day_leaderboard(integer) to authenticated;



-- ════════════════════════════════════════════════════════════════════════════
-- 202610060003_bill_debt_board_per_player_seed_upgrade.sql
-- ════════════════════════════════════════════════════════════════════════════

-- From the 2026-10-06 bug hunt.
--
-- BUG-008: a weekly bill took least(cash, bill) and dropped the rest, so a
-- player who kept every dollar in stocks never paid living costs. The unpaid
-- part now carries over as unpaid_bills: every advance collects it from cash
-- first, and net worth counts it as a debt, so dodging the bill gains nothing.
--
-- BUG-007: the 30-day board listed runs, so one player could fill it with
-- many runs (or restored copies of one). It now shows each player's best
-- ranked run, and starting new runs is capped per day.
--
-- BUG-006: legacy runs generate from their plain, readable game_seed. A
-- restore that regenerates the market now switches the run to the secret seed
-- (legacy infinite runs also switch for days not yet generated, in
-- server/src/lib/marketService.ts).
--
-- Deploy order: this migration, then the API server, then the client.


-- ── 1. Bill debt ────────────────────────────────────────────────────────────

alter table public.game_sessions
  add column if not exists unpaid_bills numeric(14, 2) not null default 0
    check (unpaid_bills >= 0);

-- A save made while in debt must restore the debt, or save/load clears it.
alter table public.save_slots
  add column if not exists unpaid_bills numeric(14, 2) not null default 0
    check (unpaid_bills >= 0);

-- Same as 202609250001 minus the debt. net_worth is checked >= 0.
create or replace function public.recompute_session_value(p_session_id uuid)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  holdings_value numeric(14, 2);
  next_net_worth numeric(14, 2);
begin
  -- Falls back to cost basis for a holding whose price row is missing (e.g.
  -- right after a restore, before the server has regenerated the market).
  select coalesce(sum(h.quantity * coalesce(p.close_price, h.average_purchase_price)), 0)
  into holdings_value
  from public.holdings h
  join public.stocks st on st.id = h.stock_id
  join public.game_sessions gs on gs.id = h.session_id
  left join public.session_stock_prices p
    on p.session_id = h.session_id
   and p.symbol = st.symbol
   and p.game_day = gs.current_day
  where h.session_id = p_session_id;

  update public.game_sessions
  set portfolio_value = round(holdings_value, 2),
      net_worth = greatest(0, round(cash_balance + holdings_value - unpaid_bills, 2)),
      updated_at = now()
  where id = p_session_id
  returning net_worth into next_net_worth;

  return next_net_worth;
end;
$$;

revoke all on function public.recompute_session_value(uuid) from public, anon, authenticated;
grant execute on function public.recompute_session_value(uuid) to service_role;

-- Same as 202610060002 with the debt carried and collected.
create or replace function public.server_advance_game_day(
  p_user_id uuid,
  p_session_id uuid,
  p_target_day integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.game_sessions%rowtype;
  next_day integer;
  due_cycles integer;
  bill_total numeric(14, 2);
  total_due numeric(14, 2);
  amount_paid numeric(14, 2);
  next_unpaid numeric(14, 2);
  next_paid_through integer;
  next_net_worth numeric(14, 2);
  next_cash numeric(14, 2);
  stale_streak boolean;
  next_cash_streak integer;
  next_hot_streak integer;
begin
  select *
  into session_row
  from public.game_sessions
  where id = p_session_id
    and user_id = p_user_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active game session not found';
  end if;

  next_day := greatest(1, p_target_day);
  if session_row.game_mode = 'limited_30' then
    next_day := least(30, next_day);
  end if;

  if next_day < session_row.current_day then
    raise exception 'The game day cannot move backwards';
  end if;

  if session_row.market_generated_through < next_day then
    raise exception 'Market data for day % has not been generated', next_day;
  end if;

  -- Weekly living costs: $100 per completed 7-day cycle (202609180001), plus
  -- whatever earlier bills cash could not cover.
  due_cycles := greatest(
    0,
    floor(next_day / 7.0)::integer
      - floor(session_row.bills_paid_through_day / 7.0)::integer
  );
  bill_total := due_cycles * 100.00;
  total_due := bill_total + session_row.unpaid_bills;
  amount_paid := least(session_row.cash_balance, total_due);
  next_unpaid := total_due - amount_paid;
  next_paid_through := case
    when due_cycles > 0 then floor(next_day / 7.0)::integer * 7
    else session_row.bills_paid_through_day
  end;

  update public.game_sessions
  set current_day = next_day,
      cash_balance = cash_balance - amount_paid,
      unpaid_bills = next_unpaid,
      bills_paid_through_day = next_paid_through,
      updated_at = now()
  where id = p_session_id;

  next_net_worth := public.recompute_session_value(p_session_id);
  next_cash := session_row.cash_balance - amount_paid;

  if session_row.game_seed is not null then
    insert into public.market_seed_progress (user_id, game_mode, game_seed, max_day)
    values (p_user_id, session_row.game_mode, session_row.game_seed, next_day)
    on conflict (user_id, game_mode, game_seed)
    do update set max_day = greatest(public.market_seed_progress.max_day, excluded.max_day);
  end if;

  if next_day > session_row.current_day then
    stale_streak := session_row.streak_last_day > session_row.current_day;
    if stale_streak then
      session_row.cash_discipline_streak := 0;
      session_row.hot_streak_days := 0;
      session_row.streak_prev_net_worth := session_row.net_worth;
    end if;

    next_cash_streak := case
      when next_net_worth > 0 and next_cash / next_net_worth >= 0.20
        then session_row.cash_discipline_streak + 1
      else 0
    end;
    next_hot_streak := case
      when next_net_worth > session_row.streak_prev_net_worth
        then session_row.hot_streak_days + 1
      else 0
    end;

    update public.game_sessions
    set cash_discipline_streak = next_cash_streak,
        hot_streak_days = next_hot_streak,
        streak_prev_net_worth = next_net_worth,
        streak_last_day = next_day
    where id = p_session_id;

    if next_cash_streak >= 5 then
      insert into public.user_achievement_unlocks (user_id, achievement_id)
      values (p_user_id, 'cash_discipline')
      on conflict do nothing;
    end if;
    if next_hot_streak >= 3 then
      insert into public.user_achievement_unlocks (user_id, achievement_id)
      values (p_user_id, 'hot_streak')
      on conflict do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'day', next_day,
    'cash', next_cash,
    'net_worth', next_net_worth,
    'cycles_charged', due_cycles,
    'bill_total', bill_total,
    'amount_paid', amount_paid,
    'shortfall', next_unpaid,
    'unpaid_bills', next_unpaid,
    'bills_paid_through_day', next_paid_through
  );
end;
$$;

revoke all on function public.server_advance_game_day(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.server_advance_game_day(uuid, uuid, integer) to service_role;

-- ── 2. Save slots carry the debt; restore upgrades the seed (BUG-006) ───────

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
         portfolio_value = slot_row.net_worth - slot_row.cash_balance,
         -- Rebase the bill clock onto the restored day (202608270001).
         bills_paid_through_day = greatest(0, floor(slot_row.game_day / 7.0)::integer * 7),
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

-- ── 3. New runs per day are capped (BUG-007) ────────────────────────────────
-- Same as 202609250001 plus the cap. A player with no active run (first
-- visit) can always start one.
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
    and game_mode = selected_mode
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

-- ── 4. 30-day board: one row per player, their best ranked run (BUG-007) ────

create or replace function public.get_30_day_leaderboard(p_limit integer default 50)
returns table (
  run_id uuid,
  user_id uuid,
  best_net_worth numeric,
  return_pct numeric,
  completed_at timestamptz,
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
  with best_run as (
    select distinct on (gs.user_id)
      gs.id, gs.user_id, gs.net_worth, gs.starting_cash, gs.updated_at
    from public.game_sessions gs
    where gs.game_mode = 'limited_30'
      and gs.current_day = 30
      and gs.ranked
    order by gs.user_id, gs.net_worth desc, gs.updated_at asc
  )
  select
    run.id,
    run.user_id,
    run.net_worth,
    round((run.net_worth - run.starting_cash) / nullif(run.starting_cash, 0) * 100, 2),
    run.updated_at,
    p.username,
    p.display_name,
    p.avatar_url,
    public.player_total_xp(run.user_id)
  from best_run run
  join public.profiles p on p.id = run.user_id
  order by run.net_worth desc, run.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.get_30_day_leaderboard(integer) from public, anon;
grant execute on function public.get_30_day_leaderboard(integer) to authenticated;



-- ════════════════════════════════════════════════════════════════════════════
-- 202610080001_lock_profile_delete_restore_debt.sql
-- ════════════════════════════════════════════════════════════════════════════

-- From the 2026-10-08 bug hunt.
--
-- BUG-001 (still open after 202610060001): players could still DELETE their
-- own profile row, then insert it again with just their id.
-- last_level_reward_processed fell back to its default of 1, so
-- process_level_cash_rewards paid every level again -- unlimited cash. Players
-- can no longer delete profiles; account deletion goes through the API
-- server (auth.admin.deleteUser), which cascades with the service role.
--
-- BUG-033: restore_save_slot (202610060003) set portfolio_value to
-- net_worth - cash. net_worth now subtracts unpaid_bills, so a slot saved with
-- more debt than holdings gave a negative value, which violated
-- check (portfolio_value >= 0), and the slot could never be loaded.
--
-- Apply after 202610060003.


-- ── 1. profiles: no player deletes ──────────────────────────────────────────

drop policy if exists "Users can delete own profile" on public.profiles;
revoke delete on public.profiles from anon, authenticated;

-- ── 2. restore_save_slot: holdings value can't go negative ──────────────────
-- Same as 202610060003 except portfolio_value.
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


commit;

-- ── Checks (read-only; every row should say ok = true) ──────────────────────
select 'players cannot delete profiles' as item,
       not has_table_privilege('authenticated', 'public.profiles', 'DELETE') as ok
union all
select 'players cannot set last_level_reward_processed',
       not has_column_privilege('authenticated', 'public.profiles', 'last_level_reward_processed', 'UPDATE')
union all
select 'server-authoritative market tables exist',
       to_regclass('public.session_stock_prices') is not null and to_regclass('public.session_market_news') is not null
union all
select 'daily goals / alerts / missions tables exist',
       to_regclass('public.user_daily_goal_completions') is not null
       and to_regclass('public.user_stock_alerts') is not null
       and to_regclass('public.user_mission_completions') is not null
union all
select 'game_sessions has market_seed_secret, ranked, unpaid_bills',
       (select count(*) from information_schema.columns
        where table_schema = 'public' and table_name = 'game_sessions'
          and column_name in ('market_seed_secret', 'ranked', 'unpaid_bills')) = 3
union all
select 'leaderboard_entries dropped, backup kept',
       to_regclass('public.leaderboard_entries') is null and to_regclass('public.leaderboard_entries_backup') is not null
union all
select 'restore_save_slot has the debt fix',
       pg_get_functiondef('public.restore_save_slot(uuid)'::regprocedure) like '%+ slot_row.unpaid_bills)%';
