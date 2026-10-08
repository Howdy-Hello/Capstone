-- NOT APPLIED. Renamed from 202610060001_gameplay_integrity.sql (version clash with the applied
-- 202610060001_lock_profile_rewards_and_achievements.sql). Written against
-- f3f4ab6: as it stands it re-creates a player-callable advance_game_day,
-- prices trades from session_quotes, and drops the live ranked/seeded-run,
-- bill-debt and run-cap logic. Do not run until it is reconciled with
-- 202609250001..202610080002 (see qa-evidence report, "Fixes applied").

begin;

-- All new gameplay writes go through checked operations. Historical state is
-- retained for play, but cannot be certified retroactively for competition.
alter table public.game_sessions
  add column market_phase text not null default 'market_open' check (market_phase in ('market_open','after_hours')),
  add column advisor_ids text[] not null default '{}',
  add column lineage_id uuid not null default gen_random_uuid(),
  add column trusted_state boolean not null default false,
  add column cash_streak integer not null default 0,
  add column gain_streak integer not null default 0;
alter table public.save_slots
  add column session_snapshot jsonb,
  add column trades_snapshot jsonb not null default '[]',
  add column journal_snapshot jsonb not null default '[]',
  add column goals_snapshot jsonb not null default '[]',
  add column reward_total numeric not null default 0;
alter table public.user_daily_goal_completions add column session_id uuid references public.game_sessions(id) on delete cascade;
alter table public.user_daily_goal_completions drop constraint user_daily_goal_completions_pkey;
-- Legacy rows have no reliable run identity. Keep them, without loading them into new runs.
create unique index daily_goal_run_key on public.user_daily_goal_completions(user_id,session_id,game_day,goal_id);

create table public.session_quotes (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  game_day integer not null check (game_day between 1 and 10000),
  symbol text not null references public.stocks(symbol),
  price numeric(12,2) not null check (price > 0),
  primary key(session_id,game_day,symbol)
);
alter table public.session_quotes enable row level security;
create policy "Read own quotes" on public.session_quotes for select to authenticated
using (exists(select 1 from public.game_sessions s where s.id=session_id and s.user_id=auth.uid()));
grant select on public.session_quotes to authenticated;
grant all on public.session_quotes to service_role;

create table public.level_reward_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  level integer not null,
  lineage_id uuid not null,
  amount numeric not null check (amount >= 0),
  primary key(user_id,level)
);
alter table public.level_reward_receipts enable row level security;

create table public.challenge_results (
  lineage_id uuid not null unique,
  run_id uuid primary key references public.game_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  net_worth numeric not null,
  starting_cash numeric not null,
  completed_at timestamptz not null default now()
);
alter table public.challenge_results enable row level security;

revoke insert, update, delete on public.game_sessions, public.holdings, public.trades from anon, authenticated;
revoke insert, update on public.save_slots from anon, authenticated;
-- A profile owner may edit identity fields, never the reward cursor.
revoke update on public.profiles from authenticated;
grant update(display_name,username,bio,avatar_url,updated_at) on public.profiles to authenticated;
revoke insert on public.profiles from authenticated;

create or replace function public.refresh_session_value(target_session_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.game_sessions%rowtype; value numeric;
begin
  select * into s from public.game_sessions where id=target_session_id and user_id=auth.uid() for update;
  if not found then raise exception 'Active game session not found'; end if;
  if exists(select 1 from public.holdings h join public.stocks st on st.id=h.stock_id
    left join public.session_quotes q on q.session_id=s.id and q.game_day=s.current_day and q.symbol=st.symbol
    where h.session_id=s.id and h.quantity>0 and q.price is null) then
    raise exception 'Market quote unavailable. Try again.';
  end if;
  select coalesce(sum(h.quantity*q.price),0) into value from public.holdings h
    join public.stocks st on st.id=h.stock_id
    join public.session_quotes q on q.session_id=s.id and q.game_day=s.current_day and q.symbol=st.symbol
    where h.session_id=s.id;
  update public.game_sessions set portfolio_value=value,net_worth=cash_balance+value where id=s.id;
  if s.game_mode='limited_30' and s.current_day=30 and s.trusted_state then
    insert into public.challenge_results(lineage_id,run_id,user_id,net_worth,starting_cash)
      values(s.lineage_id,s.id,s.user_id,s.cash_balance+value,s.starting_cash) on conflict do nothing;
  end if;
end $$;

create or replace function public.start_new_game_with_mode(target_game_mode text default 'infinite')
returns public.game_sessions language plpgsql security definer set search_path = '' as $$
declare s public.game_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_game_mode is null or target_game_mode not in ('infinite','limited_30') then raise exception 'Invalid game mode'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  update public.game_sessions set status='paused' where user_id=auth.uid() and status='active';
  insert into public.game_sessions(user_id,game_mode,game_seed,trusted_state)
    values(auth.uid(),target_game_mode,case when target_game_mode='infinite' then 'STOCKPILOT' else upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)) end,true)
    returning * into s;
  return s;
end $$;
create or replace function public.start_new_game()
returns public.game_sessions language sql security definer set search_path = '' as $$
  select public.start_new_game_with_mode('infinite');
$$;

create or replace function public.close_market(target_session_id uuid, target_game_day integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.game_sessions set market_phase='after_hours' where id=target_session_id and user_id=auth.uid()
    and status='active' and current_day=target_game_day and not (game_mode='limited_30' and current_day>=30);
  if not found then raise exception 'Your game has changed. Reload before trying again.'; end if;
end $$;

create or replace function public.hire_advisor(target_session_id uuid, target_game_day integer, advisor_id text)
returns public.game_sessions language plpgsql security definer set search_path = '' as $$
declare s public.game_sessions%rowtype;
begin
  select * into s from public.game_sessions where id=target_session_id and user_id=auth.uid() and status='active' for update;
  if not found or s.current_day<>target_game_day then raise exception 'Your game has changed. Reload before trying again.'; end if;
  if s.game_mode='limited_30' and s.current_day>=30 then raise exception 'Challenge complete. Start a new run to play.'; end if;
  if advisor_id is null or advisor_id<>'riley' then raise exception 'Advisor unavailable'; end if;
  if advisor_id=any(s.advisor_ids) then return s; end if;
  if s.cash_balance<100 then raise exception 'Not enough cash'; end if;
  update public.game_sessions set cash_balance=cash_balance-100,advisor_ids=array_append(advisor_ids,advisor_id)
    where id=s.id returning * into s;
  perform public.refresh_session_value(s.id);
  return s;
end $$;

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
  next_cash numeric(14, 2);
  next_quantity integer;
  next_average numeric(12, 2);
  trade_total numeric(14, 2);
  base_price numeric;
  slip numeric;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target_trade_type is null or target_trade_type not in ('buy', 'sell') then
    raise exception 'Trade type must be buy or sell';
  end if;

  if target_quantity is null or target_quantity <= 0 then
    raise exception 'Price and quantity must be positive';
  end if;

  if target_game_day is null or target_game_day < 1 then
    raise exception 'Game day must be at least 1';
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

  if target_game_day <> session_row.current_day then
    raise exception 'Your game has changed. Reload before trying again.';
  end if;
  if session_row.game_mode='limited_30' and session_row.current_day>=30 then
    raise exception 'Challenge complete. Start a new run to play.';
  end if;
  perform public.refresh_session_value(target_session_id);
  select * into session_row from public.game_sessions where id=target_session_id;
  select price into base_price from public.session_quotes
    where session_id=target_session_id and game_day=session_row.current_day and symbol=upper(target_symbol);
  if base_price is null then raise exception 'Market quote unavailable. Try again.'; end if;
  slip := case when session_row.net_worth>0 then least(0.12,greatest(0,(base_price*target_quantity/session_row.net_worth-0.15)*0.55)) else 0 end;
  -- target_price is retained for old clients but is never trusted.
  target_price := round(base_price*(1+case when target_trade_type='buy' then slip else -slip end),2);

  select *
  into stock_row
  from public.stocks
  where symbol = upper(target_symbol)
    and is_active = true;

  if not found then
    raise exception 'Stock not found';
  end if;

  trade_total := round(target_price * target_quantity, 2);

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
  set
    cash_balance = next_cash,
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
    target_game_day,
    target_trade_type,
    target_quantity,
    target_price
  );

  perform public.refresh_session_value(target_session_id);
  return jsonb_build_object(
    'execution_price', target_price,
    'cash', next_cash,
    'symbol', stock_row.symbol,
    'quantity', next_quantity,
    'average_purchase_price', next_average
  );
end;
$$;


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

  if target_game_mode is distinct from session_row.game_mode or target_game_day is distinct from session_row.current_day+1
      or session_row.current_day>=10000 or (session_row.game_mode='limited_30' and session_row.current_day>=30) then
    raise exception 'Your game has changed. Reload before trying again.';
  end if;
  if session_row.market_phase<>'after_hours' then raise exception 'Close the market before advancing.'; end if;
  if not exists(select 1 from public.session_quotes where session_id=target_session_id and game_day=next_day) then
    raise exception 'Market quote unavailable. Try again.';
  end if;
  perform public.refresh_session_value(target_session_id);
  select * into session_row from public.game_sessions where id=target_session_id;
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
      market_phase = 'market_open',
      game_mode = target_game_mode,
      cash_balance = cash_balance - amount_paid,
      bills_paid_through_day = next_paid_through,
      updated_at = now()
  where id = target_session_id;

  perform public.refresh_session_value(target_session_id);
  update public.game_sessions set
    cash_streak=case when net_worth>0 and cash_balance/net_worth>=0.2 then cash_streak+1 else 0 end,
    gain_streak=case when net_worth>session_row.net_worth then gain_streak+1 else 0 end
    where id=target_session_id;
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

  perform 1 from public.profiles where id=auth.uid() for update;

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

  -- A challenge level-up is consumed without payment so it cannot be claimed
  -- later by switching modes.
  if session_row.game_mode = 'infinite' then
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
      insert into public.level_reward_receipts(user_id,level,lineage_id,amount)
        values(auth.uid(),reward_level,session_row.lineage_id,reward_for_level);
      total_reward := total_reward + reward_for_level;
    end loop;

    update public.game_sessions
    set cash_balance = cash_balance + total_reward,
        updated_at = now()
    where id = target_session_id;
  end if;

  update public.profiles
  set last_level_reward_processed = current_level,
      updated_at = now()
  where id = auth.uid();

  return jsonb_build_object(
    'level', current_level,
    'cash_reward', total_reward,
    'game_mode', session_row.game_mode
  );
end;
$$;


create table public.trade_operations (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  operation_id uuid not null,
  result jsonb not null,
  primary key(session_id,operation_id)
);
alter table public.trade_operations enable row level security;
create function public.execute_trade_checked(target_session_id uuid,target_symbol text,target_trade_type text,
  target_game_day integer,target_quantity integer,operation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare previous jsonb; result jsonb;
begin
  perform 1 from public.game_sessions where id=target_session_id and user_id=auth.uid() and status='active' for update;
  if not found then raise exception 'Active game session not found'; end if;
  select o.result into previous from public.trade_operations o where o.session_id=target_session_id and o.operation_id=execute_trade_checked.operation_id;
  if found then return previous; end if;
  result := public.execute_trade(target_session_id,target_symbol,target_trade_type,0,target_game_day,target_quantity);
  insert into public.trade_operations values(target_session_id,operation_id,result);
  return result;
end $$;
revoke all on function public.execute_trade(uuid,text,text,numeric,integer,integer) from public,anon,authenticated;

create function public.create_save_slot(target_session_id uuid,slot_name text)
returns public.save_slots language plpgsql security definer set search_path = '' as $$
declare s public.game_sessions%rowtype; result public.save_slots%rowtype;
begin
  perform 1 from public.profiles where id=auth.uid() for update;
  select * into s from public.game_sessions where id=target_session_id and user_id=auth.uid() and status='active' for update;
  if not found then raise exception 'Active game session not found'; end if;
  if (select count(*) from public.save_slots where user_id=auth.uid())>=4 then raise exception 'All save slots are full.'; end if;
  if slot_name is null or length(slot_name)>100 then raise exception 'Invalid save name'; end if;
  perform public.refresh_session_value(s.id);
  select * into s from public.game_sessions where id=s.id;
  insert into public.save_slots(user_id,slot_name,game_day,game_mode,game_seed,cash_balance,net_worth,
    holdings_snapshot,session_snapshot,trades_snapshot,journal_snapshot,goals_snapshot,reward_total)
  values(auth.uid(),slot_name,s.current_day,s.game_mode,s.game_seed,s.cash_balance,s.net_worth,
    coalesce((select jsonb_agg(jsonb_build_object('symbol',st.symbol,'shares',h.quantity,'averageCost',h.average_purchase_price))
      from public.holdings h join public.stocks st on st.id=h.stock_id where h.session_id=s.id),'[]'),
    to_jsonb(s),
    coalesce((select jsonb_agg(to_jsonb(t)) from public.trades t where t.session_id=s.id),'[]'),
    coalesce((select jsonb_agg(to_jsonb(j)) from public.trade_journal_entries j where j.session_id=s.id),'[]'),
    coalesce((select jsonb_agg(to_jsonb(g)) from public.user_daily_goal_completions g where g.session_id=s.id),'[]'),
    coalesce((select sum(amount) from public.level_reward_receipts where lineage_id=s.lineage_id and user_id=auth.uid()),0))
  returning * into result;
  return result;
end $$;

-- Restores branch into a new session: old challenge results and old timelines
-- stay intact, and local session caches cannot leak into the restored run.
create or replace function public.restore_save_slot(p_slot_id uuid)
returns public.game_sessions language plpgsql security definer set search_path = '' as $$
declare slot public.save_slots%rowtype; snapshot public.game_sessions%rowtype;
  s public.game_sessions%rowtype; reward_delta numeric;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  select * into slot from public.save_slots where id=p_slot_id and user_id=auth.uid();
  if not found then raise exception 'Save slot not found'; end if;
  snapshot := jsonb_populate_record(null::public.game_sessions,coalesce(slot.session_snapshot,'{}'));
  reward_delta := greatest(0,coalesce((select sum(amount) from public.level_reward_receipts
    where user_id=auth.uid() and lineage_id=snapshot.lineage_id),0)-slot.reward_total);
  -- Lock the abandoned timeline before branching; concurrent operations then fail as stale.
  perform 1 from public.game_sessions where user_id=auth.uid() and status='active' for update;
  update public.game_sessions set status='paused' where user_id=auth.uid() and status='active';
  insert into public.game_sessions(user_id,game_mode,game_seed,current_day,cash_balance,net_worth,portfolio_value,
    bills_paid_through_day,market_phase,advisor_ids,lineage_id,trusted_state,cash_streak,gain_streak)
  values(auth.uid(),slot.game_mode,slot.game_seed,slot.game_day,slot.cash_balance+reward_delta,slot.net_worth+reward_delta,
    greatest(0,slot.net_worth-slot.cash_balance),coalesce(snapshot.bills_paid_through_day,(slot.game_day/7)*7),
    coalesce(snapshot.market_phase,'market_open'),coalesce(snapshot.advisor_ids,'{}'),coalesce(snapshot.lineage_id,gen_random_uuid()),
    coalesce(snapshot.trusted_state,false),coalesce(snapshot.cash_streak,0),coalesce(snapshot.gain_streak,0)) returning * into s;
  insert into public.holdings(session_id,stock_id,quantity,average_purchase_price)
    select s.id,st.id,(h->>'shares')::integer,(h->>'averageCost')::numeric
    from jsonb_array_elements(slot.holdings_snapshot) h join public.stocks st on st.symbol=h->>'symbol'
    where (h->>'shares')::integer>0;
  insert into public.trades(session_id,user_id,stock_id,game_day,trade_type,quantity,price_per_share,executed_at)
    select s.id,auth.uid(),t.stock_id,t.game_day,t.trade_type,t.quantity,t.price_per_share,t.executed_at
    from jsonb_populate_recordset(null::public.trades,slot.trades_snapshot) t;
  insert into public.trade_journal_entries(session_id,user_id,symbol,trade_type,quantity,execution_price,game_day,
    thesis,horizon_days,exit_plan,reviewed_day,created_at)
    select s.id,auth.uid(),j.symbol,j.trade_type,j.quantity,j.execution_price,j.game_day,j.thesis,j.horizon_days,j.exit_plan,j.reviewed_day,j.created_at
    from jsonb_populate_recordset(null::public.trade_journal_entries,slot.journal_snapshot) j;
  insert into public.user_daily_goal_completions(user_id,session_id,game_day,goal_id,completed_at)
    select auth.uid(),s.id,g.game_day,g.goal_id,g.completed_at
    from jsonb_populate_recordset(null::public.user_daily_goal_completions,slot.goals_snapshot) g;
  return s;
end $$;

-- Only database-observable achievements can unlock. Progress from the browser
-- is advisory; these exact raw thresholds gate account XP and cash rewards.
create function public.achievement_eligible(achievement text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare s public.game_sessions%rowtype; held integer; sectors integer; trades integer; watched integer;
begin
  select * into s from public.game_sessions where user_id=auth.uid() and status='active' order by updated_at desc limit 1;
  if not found or not s.trusted_state then return false; end if;
  select count(*),count(distinct st.sector) into held,sectors from public.holdings h join public.stocks st on st.id=h.stock_id where h.session_id=s.id and h.quantity>0;
  select count(*) into trades from public.trades where session_id=s.id;
  select count(*) into watched from public.user_watchlist where user_id=auth.uid();
  return case achievement
    when 'first_trade' then trades>=1 when 'risk_taker' then held>=3
    when 'active_trader' then trades>=10 when 'diversified' then held>=5
    when 'sector_scout' then sectors>=3 when 'watchlist_builder' then watched>=3
    when 'cash_builder' then s.cash_balance>=5000 when 'market_regular' then s.current_day>=5
    when 'closing_bell' then s.current_day>=30 when 'smart_investor' then s.net_worth>=15000
    when 'cash_discipline' then s.cash_streak>=5 when 'hot_streak' then s.gain_streak>=3
    when 'market_master' then s.net_worth>=50000 else false end;
end $$;
drop policy "Users own their achievement unlocks" on public.user_achievement_unlocks;
create policy "Read own achievements" on public.user_achievement_unlocks for select to authenticated using(user_id=auth.uid());
create policy "Earn achievements" on public.user_achievement_unlocks for insert to authenticated
with check(user_id=auth.uid() and public.achievement_eligible(achievement_id));
revoke update,delete on public.user_achievement_unlocks from anon,authenticated;

create or replace function public.get_30_day_leaderboard(p_limit integer default 50)
returns table(run_id uuid,user_id uuid,best_net_worth numeric,return_pct numeric,completed_at timestamptz,
 username text,display_name text,avatar_url text,total_xp bigint)
language sql stable security definer set search_path = '' as $$
 select r.run_id,r.user_id,r.net_worth,round((r.net_worth-r.starting_cash)/nullif(r.starting_cash,0)*100,2),
 r.completed_at,p.username,p.display_name,p.avatar_url,public.player_total_xp(r.user_id)
 from public.challenge_results r join public.profiles p on p.id=r.user_id
 order by r.net_worth desc,r.completed_at asc limit greatest(1,least(coalesce(p_limit,50),100));
$$;

drop policy "Users own their daily goal completions" on public.user_daily_goal_completions;
create policy "Read daily goals" on public.user_daily_goal_completions for select to authenticated using(user_id=auth.uid());
create policy "Complete run goals" on public.user_daily_goal_completions for insert to authenticated
with check(user_id=auth.uid() and goal_id in ('hold3','networth','cash20','watch2','highrisk','sectors2')
 and exists(select 1 from public.game_sessions s where s.id=session_id and s.user_id=auth.uid() and s.status='active' and s.current_day=game_day));
revoke update,delete on public.user_daily_goal_completions from authenticated;

create or replace function public.get_leaderboard(p_limit integer default 50)
returns table(user_id uuid,best_net_worth numeric,return_pct numeric,username text,display_name text,avatar_url text,total_xp bigint)
language sql stable security definer set search_path = '' as $$
 with runs as (select distinct on(s.user_id) s.* from public.game_sessions s
   where s.game_mode='infinite' and s.trusted_state order by s.user_id,s.started_at desc,s.id desc)
 select r.user_id,r.net_worth,round((r.net_worth-r.starting_cash)/nullif(r.starting_cash,0)*100,2),
 p.username,p.display_name,p.avatar_url,public.player_total_xp(r.user_id)
 from runs r join public.profiles p on p.id=r.user_id
 order by r.net_worth desc limit greatest(1,least(coalesce(p_limit,50),100));
$$;

revoke all on function public.refresh_session_value(uuid),public.close_market(uuid,integer),
 public.hire_advisor(uuid,integer,text),public.execute_trade_checked(uuid,text,text,integer,integer,uuid),
 public.create_save_slot(uuid,text),public.achievement_eligible(text) from public,anon;
grant execute on function public.refresh_session_value(uuid),public.close_market(uuid,integer),
 public.hire_advisor(uuid,integer,text),public.execute_trade_checked(uuid,text,text,integer,integer,uuid),
 public.create_save_slot(uuid,text),public.achievement_eligible(text) to authenticated;
-- Local-only purchases from before this migration can be recovered in practice
-- runs. They can never be imported into a verified competitive run.
create function public.import_legacy_advisor(target_session_id uuid)
returns public.game_sessions language plpgsql security definer set search_path = '' as $$
declare s public.game_sessions%rowtype;
begin
  select * into s from public.game_sessions where id=target_session_id and user_id=auth.uid()
    and status='active' and not trusted_state for update;
  if not found then raise exception 'Legacy practice session not found'; end if;
  if not ('riley'=any(s.advisor_ids)) then
    update public.game_sessions set advisor_ids=array_append(advisor_ids,'riley') where id=s.id returning * into s;
  end if;
  return s;
end $$;
revoke all on function public.import_legacy_advisor(uuid) from public,anon;
grant execute on function public.import_legacy_advisor(uuid) to authenticated;

commit;
