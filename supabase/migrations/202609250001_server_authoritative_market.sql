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
begin;

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

commit;
