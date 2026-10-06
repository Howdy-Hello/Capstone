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

begin;

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

commit;
