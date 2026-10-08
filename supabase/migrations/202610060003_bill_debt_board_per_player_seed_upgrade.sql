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

begin;

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

commit;
