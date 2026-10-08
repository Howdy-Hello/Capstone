-- Reconciles Howdy-Hello's gameplay/learning work (the never-applied
-- 202610080003_gameplay_integrity / 202610080004_learning_and_account_breakdown,
-- now deleted) with the live server-authoritative schema (everything through
-- 202610080002). Every function below starts from its live definition; the
-- changes are listed in its comment.
--
-- Ported from 080003/080004:
--   market phase (close_market; advance needs a closed market, no trading
--   after hours), server-owned advisor hire, idempotent trades
--   (execute_trade_checked), learning_entries, account_flows +
--   get_account_breakdown, create_save_slot(session id, name), server-checked
--   learning daily goals.
-- Left out on purpose (they undo live fixes or duplicate live objects):
--   session_quotes, refresh_session_value, a player-callable
--   advance_game_day, trusted_state/lineage_id/cash_streak/gain_streak,
--   challenge_results, level_reward_receipts, achievement_eligible, the
--   branching restore, and their versions of start_new_game_with_mode and
--   both leaderboards.
-- Bug-hunt fixes held back from 202610080002:
--   BUG-014: trades and day advances refuse a run whose stored market does
--     not match its mode/seed/engine fingerprint.
--   BUG-016: slippage is charged on the day's cumulative quantity per stock
--     and side, so splitting an order no longer avoids it.
--   BUG-025: average cost is stored unrounded (6 decimals).
--   BUG-035: level cash rewards are paid only into ranked endless runs; XP
--     still counts from every run.
--
-- Deploy order: this migration, then the API server, then the client.

begin;

-- ── 1. Columns ──────────────────────────────────────────────────────────────
alter table public.game_sessions
  add column if not exists market_phase text not null default 'market_open'
    check (market_phase in ('market_open', 'after_hours')),
  add column if not exists advisor_ids text[] not null default '{}';

-- A save carries the advisors hired so far, like cash and holdings.
alter table public.save_slots
  add column if not exists advisor_ids text[] not null default '{}';

-- BUG-025: two decimals lost up to half a cent per share on every buy, and
-- the drift compounded across buys.
alter table public.holdings
  alter column average_purchase_price type numeric(18, 6);

-- ── 2. Learning journal (from 080004, unchanged) ────────────────────────────
-- Learning credit records practice, not a certification of reasoning quality.
create table if not exists public.learning_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  game_day integer not null check (game_day between 1 and 10000),
  kind text not null check (kind in ('research', 'compare', 'risk', 'plan', 'wait', 'reflection')),
  symbol text check (length(symbol) <= 100),
  journal_id uuid references public.trade_journal_entries(id) on delete set null,
  decision text not null check (decision in ('wait', 'avoid', 'consider', 'keep', 'reduce')),
  evidence text not null check (length(trim(evidence)) between 20 and 1000),
  reflection text not null default '' check (length(reflection) <= 1000),
  created_at timestamptz not null default now(),
  check (kind <> 'wait' or decision in ('wait', 'avoid', 'keep')),
  check (kind <> 'reflection' or length(trim(reflection)) >= 20)
);
create index if not exists learning_entries_run_day on public.learning_entries(session_id, game_day);
alter table public.learning_entries enable row level security;
revoke all on public.learning_entries from anon, authenticated;
grant select, insert on public.learning_entries to authenticated;
grant all on public.learning_entries to service_role;

drop policy if exists "Read own learning" on public.learning_entries;
create policy "Read own learning" on public.learning_entries
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Record learning in current run" on public.learning_entries;
create policy "Record learning in current run" on public.learning_entries
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.game_sessions s
      where s.id = session_id and s.user_id = auth.uid()
        and s.current_day = game_day and s.status = 'active'
    )
    and (journal_id is null or exists (
      select 1 from public.trade_journal_entries j
      where j.id = journal_id and j.session_id = learning_entries.session_id and j.user_id = auth.uid()
    ))
  );

-- ── 3. Daily goals: learning goals need a matching note (from 080004) ───────
-- Same as 202610080002 (BUG-017) plus: only today's goal in the active run,
-- and the goal's evidence must exist in the database.
drop policy if exists "Users own their daily goal completions" on public.user_daily_goal_completions;
create policy "Users own their daily goal completions"
  on public.user_daily_goal_completions for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.game_sessions gs
      where gs.id = session_id and gs.user_id = auth.uid()
        and gs.status = 'active' and gs.current_day = game_day
    )
    and (
      (goal_id = 'watch2'
        and (select count(*) from public.user_watchlist w where w.user_id = auth.uid()) >= 2)
      or (goal_id in ('learn_research', 'learn_compare', 'learn_risk', 'learn_plan', 'learn_wait')
        and exists (
          select 1 from public.learning_entries e
          where e.session_id = user_daily_goal_completions.session_id
            and e.game_day = user_daily_goal_completions.game_day
            and e.user_id = auth.uid()
            and 'learn_' || e.kind = goal_id
        ))
    )
  );

-- ── 4. Account flows (from 080004) ──────────────────────────────────────────
-- Non-investment money movements, so the dashboard can split net worth into
-- starting value, living costs, advisor fees, rewards and investment P/L.
-- Trades are internal transfers and are not recorded here.
create table if not exists public.account_flows (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  game_day integer not null,
  kind text not null check (kind in ('opening', 'living_cost', 'advisor', 'reward')),
  amount numeric(14, 2) not null,
  created_at timestamptz not null default now()
);
create index if not exists account_flows_run on public.account_flows(session_id);
create unique index if not exists account_flows_opening on public.account_flows(session_id) where kind = 'opening';
alter table public.account_flows enable row level security;
revoke all on public.account_flows from anon, authenticated;
grant select on public.account_flows to authenticated;
grant all on public.account_flows to service_role;

drop policy if exists "Read own account flows" on public.account_flows;
create policy "Read own account flows" on public.account_flows
  for select to authenticated using (
    exists (select 1 from public.game_sessions s where s.id = session_id and s.user_id = auth.uid())
  );

create or replace function public.open_account_tracking()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.account_flows (session_id, game_day, kind, amount)
  values (new.id, new.current_day, 'opening', new.net_worth)
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.open_account_tracking() from public, anon, authenticated;

drop trigger if exists track_account_opening on public.game_sessions;
create trigger track_account_opening after insert on public.game_sessions
  for each row execute function public.open_account_tracking();

-- Existing runs start tracking from their stored net worth today. No
-- historical expense total is invented.
insert into public.account_flows (session_id, game_day, kind, amount)
select s.id, s.current_day, 'opening', s.net_worth
from public.game_sessions s
on conflict do nothing;

-- Aggregated in PostgreSQL so API row limits cannot silently drop old bills.
create or replace function public.get_account_breakdown(target_session_id uuid)
returns table(kind text, amount numeric, game_day integer)
language sql stable security invoker set search_path = '' as $$
  select f.kind, sum(f.amount), min(f.game_day)
  from public.account_flows f
  where f.session_id = target_session_id
  group by f.kind;
$$;
revoke all on function public.get_account_breakdown(uuid) from public, anon;
grant execute on function public.get_account_breakdown(uuid) to authenticated;

-- ── 5. Market phase ─────────────────────────────────────────────────────────
-- Closing the market reveals the day's news; the next day's prices react to
-- it, so trading is refused until the day advances.
create or replace function public.close_market(target_session_id uuid, target_game_day integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.game_sessions
  set market_phase = 'after_hours', updated_at = now()
  where id = target_session_id
    and user_id = auth.uid()
    and status = 'active'
    and current_day = target_game_day
    and not (game_mode = 'limited_30' and current_day >= 30);

  if not found then
    raise exception 'Your game has changed. Reload before trying again.';
  end if;
end;
$$;
revoke all on function public.close_market(uuid, integer) from public, anon;
grant execute on function public.close_market(uuid, integer) to authenticated;

-- ── 6. execute_trade ────────────────────────────────────────────────────────
-- Same as 202609250001 plus: the requested day must be the run's day, a
-- finished 30-day run and an after-hours market refuse trades, BUG-014,
-- BUG-016, BUG-025, and `execution_price` in the result.
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
  prior_quantity integer;
  value_before numeric;
  value_after numeric;
  fill_price numeric;
  next_cash numeric(14, 2);
  next_quantity integer;
  next_average numeric(18, 6);
  trade_total numeric(14, 2);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target_trade_type is null or target_trade_type not in ('buy', 'sell') then
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

  -- target_price is ignored; target_game_day guards against a stale screen.
  if target_game_day is distinct from session_row.current_day then
    raise exception 'Your game has changed. Reload before trying again.';
  end if;

  if session_row.game_mode = 'limited_30' and session_row.current_day >= 30 then
    raise exception 'Challenge complete. Start a new run to play.';
  end if;

  if session_row.market_phase = 'after_hours' then
    raise exception 'The market is closed. Advance to the next day to trade.';
  end if;

  -- BUG-014: stored prices must belong to this run's mode + seed + engine.
  if session_row.market_fingerprint is distinct from public.market_fingerprint_for(
       session_row.game_mode, session_row.game_seed, session_row.market_engine)
     or session_row.market_generated_through < session_row.current_day then
    raise exception 'Market data for this day is not ready yet';
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

  -- BUG-016: slippage (free up to 15% of net worth, then 0.55 per unit of
  -- excess ratio, capped at 12%) applies to everything bought, or sold, in
  -- this stock today. This order pays the difference, so ten small orders
  -- cost the same as one large one.
  select coalesce(sum(t.quantity), 0)
  into prior_quantity
  from public.trades t
  where t.session_id = target_session_id
    and t.stock_id = stock_row.id
    and t.game_day = session_row.current_day
    and t.trade_type = target_trade_type;

  value_before := public.slipped_trade_value(base_price, prior_quantity, net_worth_before, target_trade_type);
  value_after := public.slipped_trade_value(base_price, prior_quantity + target_quantity, net_worth_before, target_trade_type);
  trade_total := round(value_after - value_before, 2);
  fill_price := trade_total / target_quantity;

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
    -- BUG-025: kept to 6 decimals instead of cents.
    next_average := (
      coalesce(holding_row.average_purchase_price * holding_row.quantity, 0)
      + trade_total
    ) / next_quantity;

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
    'execution_price', round(fill_price, 4),
    'total', trade_total,
    'game_day', session_row.current_day
  );
end;
$$;

-- Value of `quantity` shares after slippage: paid for a buy, received for a
-- sale. Must match getTradeQuote in client/src/context/GameContext.tsx.
create or replace function public.slipped_trade_value(
  p_price numeric, p_quantity integer, p_net_worth numeric, p_trade_type text
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select p_price * p_quantity * (1 + case when p_trade_type = 'buy' then 1 else -1 end * (
    case
      when p_net_worth > 0 and p_price * p_quantity / p_net_worth > 0.15
        then least(0.12, (p_price * p_quantity / p_net_worth - 0.15) * 0.55)
      else 0
    end));
$$;
revoke all on function public.slipped_trade_value(numeric, integer, numeric, text) from public, anon;

-- Still granted: the client deployed before this migration calls it directly.
-- Revoke from authenticated once the new client is live.
revoke all on function public.execute_trade(uuid, text, text, numeric, integer, integer) from public, anon;
grant execute on function public.execute_trade(uuid, text, text, numeric, integer, integer) to authenticated;

-- ── 7. Idempotent trades (from 080003) ──────────────────────────────────────
-- A retried request (timeout, double click) with the same operation id
-- returns the first result instead of trading twice.
create table if not exists public.trade_operations (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  operation_id uuid not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (session_id, operation_id)
);
alter table public.trade_operations enable row level security;
revoke all on public.trade_operations from anon, authenticated;

create or replace function public.execute_trade_checked(
  target_session_id uuid,
  target_symbol text,
  target_trade_type text,
  target_game_day integer,
  target_quantity integer,
  operation_id uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  previous jsonb;
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if operation_id is null then
    raise exception 'operation_id is required';
  end if;

  perform 1 from public.game_sessions
  where id = target_session_id and user_id = auth.uid() and status = 'active'
  for update;
  if not found then
    raise exception 'Active game session not found';
  end if;

  select o.result into previous
  from public.trade_operations o
  where o.session_id = target_session_id
    and o.operation_id = execute_trade_checked.operation_id;
  if found then
    return previous;
  end if;

  result := public.execute_trade(target_session_id, target_symbol, target_trade_type,
    0, target_game_day, target_quantity);
  insert into public.trade_operations (session_id, operation_id, result)
  values (target_session_id, execute_trade_checked.operation_id, result);
  return result;
end;
$$;
revoke all on function public.execute_trade_checked(uuid, text, text, integer, integer, uuid) from public, anon;
grant execute on function public.execute_trade_checked(uuid, text, text, integer, integer, uuid) to authenticated;

-- ── 8. Advisor hire (from 080004) ───────────────────────────────────────────
-- Riley ($100) is the only advisor for sale. The hire is stored on the run,
-- so it is no longer lost with the browser's storage.
create or replace function public.hire_advisor(target_session_id uuid, target_game_day integer, advisor_id text)
returns public.game_sessions language plpgsql security definer set search_path = '' as $$
declare
  s public.game_sessions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into s from public.game_sessions
  where id = target_session_id and user_id = auth.uid() and status = 'active'
  for update;
  if not found or s.current_day <> target_game_day then
    raise exception 'Your game has changed. Reload before trying again.';
  end if;
  if s.game_mode = 'limited_30' and s.current_day >= 30 then
    raise exception 'Challenge complete. Start a new run to play.';
  end if;
  if advisor_id is null or advisor_id <> 'riley' then
    raise exception 'Advisor unavailable';
  end if;
  if advisor_id = any(s.advisor_ids) then
    return s;
  end if;
  if s.cash_balance < 100 then
    raise exception 'Not enough cash';
  end if;

  update public.game_sessions
  set cash_balance = cash_balance - 100,
      advisor_ids = array_append(advisor_ids, advisor_id),
      updated_at = now()
  where id = s.id;

  insert into public.account_flows (session_id, game_day, kind, amount)
  values (s.id, s.current_day, 'advisor', -100);

  perform public.recompute_session_value(s.id);
  select * into s from public.game_sessions where id = target_session_id;
  return s;
end;
$$;
revoke all on function public.hire_advisor(uuid, integer, text) from public, anon;
grant execute on function public.hire_advisor(uuid, integer, text) to authenticated;

-- ── 9. server_advance_game_day ──────────────────────────────────────────────
-- Same as 202610060003 plus: moving forward needs a closed market and opens
-- the next one, BUG-014, and a living_cost flow for each bill charged (paid
-- or added to the debt, both lower net worth).
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

  if next_day > session_row.current_day and session_row.market_phase <> 'after_hours' then
    raise exception 'Close the market before advancing.';
  end if;

  -- BUG-014: the generated rows must belong to this run's market.
  if session_row.market_fingerprint is distinct from public.market_fingerprint_for(
       session_row.game_mode, session_row.game_seed, session_row.market_engine)
     or session_row.market_generated_through < next_day then
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
      market_phase = case when next_day > session_row.current_day then 'market_open' else market_phase end,
      cash_balance = cash_balance - amount_paid,
      unpaid_bills = next_unpaid,
      bills_paid_through_day = next_paid_through,
      updated_at = now()
  where id = p_session_id;

  if bill_total > 0 then
    insert into public.account_flows (session_id, game_day, kind, amount)
    values (p_session_id, next_day, 'living_cost', -bill_total);
  end if;

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

-- ── 10. Save slots ──────────────────────────────────────────────────────────
-- The client now names the run it is saving. Same as 202610080002's
-- create_save_slot(text) except: the run comes from the argument (and must be
-- the caller's active run), and the advisors are saved.
create or replace function public.create_save_slot(target_session_id uuid, slot_name text default null)
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

  -- BUG-015: two concurrent saves both counted 3 and both inserted.
  perform pg_advisory_xact_lock(hashtextextended('create_save_slot:' || auth.uid()::text, 0));

  if (select count(*) from public.save_slots where user_id = auth.uid()) >= 4 then
    raise exception 'Maximum 4 save slots reached';
  end if;

  select *
  into session_row
  from public.game_sessions
  where id = target_session_id and user_id = auth.uid() and status = 'active'
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
    cash_balance, net_worth, holdings_snapshot, ranked, market_engine, unpaid_bills,
    advisor_ids
  )
  values (
    auth.uid(),
    coalesce(nullif(left(trim(slot_name), 60), ''), 'Day ' || session_row.current_day || ' Run'),
    session_row.current_day,
    session_row.game_mode,
    session_row.game_seed,
    session_row.cash_balance,
    session_row.net_worth,
    snapshot,
    session_row.ranked,
    session_row.market_engine,
    session_row.unpaid_bills,
    session_row.advisor_ids
  )
  returning * into slot_row;

  return slot_row;
end;
$$;

revoke all on function public.create_save_slot(uuid, text) from public, anon;
grant execute on function public.create_save_slot(uuid, text) to authenticated;

-- The deployed client still calls create_save_slot(p_slot_name).
create or replace function public.create_save_slot(p_slot_name text default null)
returns public.save_slots
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_id uuid;
begin
  select id into active_id
  from public.game_sessions
  where user_id = auth.uid() and status = 'active'
  order by updated_at desc
  limit 1;

  return public.create_save_slot(active_id, p_slot_name);
end;
$$;

revoke all on function public.create_save_slot(text) from public, anon;
grant execute on function public.create_save_slot(text) to authenticated;

-- Same as 202610080002 plus: the market reopens, the slot's advisors come
-- back, and account tracking restarts from the restored net worth (flows of
-- the abandoned timeline no longer describe this one).
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
         market_phase    = 'market_open',
         advisor_ids     = slot_row.advisor_ids,
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

  delete from public.account_flows where session_id = session_row.id;
  insert into public.account_flows (session_id, game_day, kind, amount)
  values (session_row.id, session_row.current_day, 'opening', session_row.net_worth);

  return session_row;
end;
$$;

revoke all on function public.restore_save_slot(uuid) from public, anon;
grant execute on function public.restore_save_slot(uuid) to authenticated;

-- ── 11. Level cash rewards ──────────────────────────────────────────────────
-- Same as 202607310002 plus: BUG-035, only a ranked endless run is paid (a
-- level-up in any other run is consumed without payment, as challenge runs
-- already were, so it cannot be cashed in later), and a reward flow.
create or replace function public.process_level_cash_rewards(
  target_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.game_sessions%rowtype;
  profile_row public.profiles%rowtype;
  current_level integer;
  reward_level integer;
  reward_for_level numeric(14, 2);
  total_reward numeric(14, 2) := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
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
  into profile_row
  from public.profiles
  where id = auth.uid()
  for update;

  current_level := public.player_level_from_xp(
    public.player_total_xp(auth.uid())
  );

  if current_level <= profile_row.last_level_reward_processed then
    return jsonb_build_object(
      'level', current_level,
      'cash_reward', 0,
      'game_mode', session_row.game_mode
    );
  end if;

  if session_row.game_mode = 'infinite' and session_row.ranked then
    for reward_level in
      (profile_row.last_level_reward_processed + 1)..current_level
    loop
      reward_for_level := case reward_level
        when 2 then 50
        when 3 then 75
        when 4 then 100
        when 5 then 150
        else least(300, 150 + (reward_level - 5) * 25)
          + case when reward_level % 5 = 0 then 200 else 0 end
      end;
      total_reward := total_reward + reward_for_level;
    end loop;

    update public.game_sessions
    set cash_balance = cash_balance + total_reward,
        updated_at = now()
    where id = target_session_id;

    if total_reward > 0 then
      insert into public.account_flows (session_id, game_day, kind, amount)
      values (target_session_id, session_row.current_day, 'reward', total_reward);
    end if;

    perform public.recompute_session_value(target_session_id);
  end if;

  update public.profiles
  set last_level_reward_processed = current_level,
      updated_at = now()
  where id = auth.uid();

  return jsonb_build_object(
    'level', current_level,
    'cash_reward', total_reward,
    'game_mode', session_row.game_mode,
    'ranked', session_row.ranked
  );
end;
$$;

revoke all on function public.process_level_cash_rewards(uuid) from public, anon;
grant execute on function public.process_level_cash_rewards(uuid) to authenticated;

commit;
