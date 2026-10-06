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

begin;

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

commit;
