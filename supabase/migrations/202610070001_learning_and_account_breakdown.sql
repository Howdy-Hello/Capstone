begin;

-- Learning credit records practice, not a certification of reasoning quality.
create table public.learning_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  game_day integer not null check(game_day between 1 and 10000),
  kind text not null check(kind in ('research','compare','risk','plan','wait','reflection')),
  symbol text check(length(symbol)<=100),
  journal_id uuid references public.trade_journal_entries(id) on delete set null,
  decision text not null check(decision in ('wait','avoid','consider','keep','reduce')),
  evidence text not null check(length(trim(evidence)) between 20 and 1000),
  reflection text not null default '' check(length(reflection)<=1000),
  created_at timestamptz not null default now(),
  check(kind<>'wait' or decision in ('wait','avoid','keep')),
  check(kind<>'reflection' or length(trim(reflection))>=20)
);
create index learning_entries_run_day on public.learning_entries(session_id,game_day);
alter table public.learning_entries enable row level security;
revoke all on public.learning_entries from anon, authenticated;
grant select,insert on public.learning_entries to authenticated;
grant all on public.learning_entries to service_role;
create policy "Read own learning" on public.learning_entries for select to authenticated using(user_id=auth.uid());
create policy "Record learning in current run" on public.learning_entries for insert to authenticated with check(
  user_id=auth.uid() and exists(select 1 from public.game_sessions s where s.id=session_id and s.user_id=auth.uid() and s.current_day=game_day and s.status='active')
  and (journal_id is null or exists(select 1 from public.trade_journal_entries j where j.id=journal_id and j.session_id=learning_entries.session_id and j.user_id=auth.uid()))
);

drop policy "Complete run goals" on public.user_daily_goal_completions;
create policy "Complete run learning goals" on public.user_daily_goal_completions for insert to authenticated with check(
  user_id=auth.uid() and exists(select 1 from public.game_sessions s where s.id=session_id and s.user_id=auth.uid() and s.status='active' and s.current_day=game_day)
  and (
    goal_id='watch2' and (select count(*) from public.user_watchlist w where w.user_id=auth.uid())>=2
    or goal_id in ('learn_research','learn_compare','learn_risk','learn_plan','learn_wait') and exists(
      select 1 from public.learning_entries e where e.session_id=user_daily_goal_completions.session_id and e.game_day=user_daily_goal_completions.game_day and e.user_id=auth.uid() and 'learn_'||e.kind=goal_id)
  )
);

-- Exact non-investment flows. Trade cash movements are internal transfers and
-- are deliberately excluded; investment P/L includes execution costs.
create table public.account_flows (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  game_day integer not null,
  kind text not null check(kind in ('opening','living_cost','advisor','reward')),
  amount numeric(14,2) not null,
  created_at timestamptz not null default now()
);
create index account_flows_run on public.account_flows(session_id);
create unique index account_flows_opening on public.account_flows(session_id) where kind='opening';
alter table public.account_flows enable row level security;
revoke all on public.account_flows from anon,authenticated;
grant select on public.account_flows to authenticated;
grant all on public.account_flows to service_role;
create policy "Read own account flows" on public.account_flows for select to authenticated using(
  exists(select 1 from public.game_sessions s where s.id=session_id and s.user_id=auth.uid())
);
create function public.open_account_tracking() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.account_flows(session_id,game_day,kind,amount) values(new.id,new.current_day,'opening',new.net_worth);
  return new;
end $$;
revoke all on function public.open_account_tracking() from public,anon,authenticated;
create trigger track_account_opening after insert on public.game_sessions for each row execute function public.open_account_tracking();
-- Old runs start tracking now, using current quotes. Do not invent a historical
-- expense total from day counts, because bills can be only partly paid.
insert into public.account_flows(session_id,game_day,kind,amount)
select s.id,s.current_day,'opening',s.cash_balance+coalesce((select sum(h.quantity*q.price) from public.holdings h join public.stocks st on st.id=h.stock_id join public.session_quotes q on q.session_id=s.id and q.game_day=s.current_day and q.symbol=st.symbol where h.session_id=s.id),0)
from public.game_sessions s where not exists(
  select 1 from public.holdings h join public.stocks st on st.id=h.stock_id left join public.session_quotes q on q.session_id=s.id and q.game_day=s.current_day and q.symbol=st.symbol where h.session_id=s.id and h.quantity>0 and q.price is null
);

-- For a legacy run lacking stored quotes, start at the next trusted refresh.
create function public.start_missing_account_tracking() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.account_flows f where f.session_id=new.id and f.kind='opening') then
    delete from public.account_flows where session_id=new.id;
    insert into public.account_flows(session_id,game_day,kind,amount) values(new.id,new.current_day,'opening',new.net_worth) on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function public.start_missing_account_tracking() from public,anon,authenticated;
create trigger start_missing_account_tracking after update of net_worth,portfolio_value on public.game_sessions for each row execute function public.start_missing_account_tracking();

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
  perform public.refresh_session_value(s.id);
  update public.game_sessions set cash_balance=cash_balance-100,advisor_ids=array_append(advisor_ids,advisor_id)
    where id=s.id returning * into s;
  perform public.refresh_session_value(s.id);
  insert into public.account_flows(session_id,game_day,kind,amount) values(s.id,s.current_day,'advisor',-100);
  return s;
end $$;

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

  if amount_paid>0 then
    insert into public.account_flows(session_id,game_day,kind,amount) values(target_session_id,next_day,'living_cost',-amount_paid);
  end if;
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
    if total_reward>0 then
      insert into public.account_flows(session_id,game_day,kind,amount) values(target_session_id,session_row.current_day,'reward',total_reward);
    end if;
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

alter table public.save_slots add column learning_snapshot jsonb not null default '[]', add column flows_snapshot jsonb not null default '[]';

create or replace function public.create_save_slot(target_session_id uuid,slot_name text)
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
    holdings_snapshot,session_snapshot,trades_snapshot,journal_snapshot,goals_snapshot,reward_total,learning_snapshot,flows_snapshot)
  values(auth.uid(),slot_name,s.current_day,s.game_mode,s.game_seed,s.cash_balance,s.net_worth,
    coalesce((select jsonb_agg(jsonb_build_object('symbol',st.symbol,'shares',h.quantity,'averageCost',h.average_purchase_price))
      from public.holdings h join public.stocks st on st.id=h.stock_id where h.session_id=s.id),'[]'),
    to_jsonb(s),
    coalesce((select jsonb_agg(to_jsonb(t)) from public.trades t where t.session_id=s.id),'[]'),
    coalesce((select jsonb_agg(to_jsonb(j)) from public.trade_journal_entries j where j.session_id=s.id),'[]'),
    coalesce((select jsonb_agg(to_jsonb(g)) from public.user_daily_goal_completions g where g.session_id=s.id),'[]'),
    coalesce((select sum(amount) from public.level_reward_receipts where lineage_id=s.lineage_id and user_id=auth.uid()),0),
    coalesce((select jsonb_agg(to_jsonb(e)) from public.learning_entries e where e.session_id=s.id),'[]'),
    coalesce((select jsonb_agg(to_jsonb(f) order by f.id) from public.account_flows f where f.session_id=s.id),'[]'))
  returning * into result;
  return result;
end $$;

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
  insert into public.learning_entries(user_id,session_id,game_day,kind,symbol,journal_id,decision,evidence,reflection,created_at)
    select auth.uid(),s.id,e.game_day,e.kind,e.symbol,
      (select j.id from public.trade_journal_entries j join jsonb_populate_recordset(null::public.trade_journal_entries,slot.journal_snapshot) original on original.id=e.journal_id
       where j.session_id=s.id and j.created_at=original.created_at and j.symbol=original.symbol and j.trade_type=original.trade_type and j.game_day=original.game_day and j.quantity=original.quantity and j.execution_price=original.execution_price and j.thesis=original.thesis and j.exit_plan=original.exit_plan and j.horizon_days=original.horizon_days limit 1),
      e.decision,e.evidence,e.reflection,e.created_at
    from jsonb_populate_recordset(null::public.learning_entries,slot.learning_snapshot) e;
  if jsonb_array_length(slot.flows_snapshot)>0 then
    delete from public.account_flows where session_id=s.id;
    insert into public.account_flows(session_id,game_day,kind,amount,created_at)
      select s.id,f.game_day,f.kind,f.amount,f.created_at from jsonb_populate_recordset(null::public.account_flows,slot.flows_snapshot) f;
    if reward_delta>0 then
      insert into public.account_flows(session_id,game_day,kind,amount) values(s.id,s.current_day,'reward',reward_delta);
    end if;
  end if;
  return s;
end $$;

-- Aggregate in PostgreSQL so API row limits cannot silently omit old bills.
create function public.get_account_breakdown(target_session_id uuid)
returns table(kind text,amount numeric,game_day integer)
language sql stable security invoker set search_path='' as $$
  select f.kind,sum(f.amount),min(f.game_day) from public.account_flows f
  where f.session_id=target_session_id group by f.kind;
$$;
revoke all on function public.get_account_breakdown(uuid) from public,anon;
grant execute on function public.get_account_breakdown(uuid) to authenticated;
commit;
