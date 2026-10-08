-- Restore the market/competition guarantees lost when later migrations
-- replaced the checked gameplay functions. No historical market is rewritten.
begin;

-- Advance prepares tomorrow's quotes before committing the day. Players must
-- not read those quotes if an advance fails or is still in flight.
drop policy "Read own quotes" on public.session_quotes;
create policy "Read own quotes" on public.session_quotes for select to authenticated
using(exists(select 1 from public.game_sessions s
  where s.id=session_quotes.session_id and s.user_id=auth.uid()
    and session_quotes.game_day<=s.current_day));

-- Record progress for every day-advance path, including advance_game_day.
insert into public.market_seed_progress(user_id,game_mode,game_seed,max_day)
select user_id,game_mode,game_seed,max(current_day) from public.game_sessions
where game_seed is not null group by user_id,game_mode,game_seed
on conflict(user_id,game_mode,game_seed) do update
set max_day=greatest(public.market_seed_progress.max_day,excluded.max_day);

create function public.track_market_progress() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.game_seed is not null then
    insert into public.market_seed_progress(user_id,game_mode,game_seed,max_day)
      values(new.user_id,new.game_mode,new.game_seed,new.current_day)
    on conflict(user_id,game_mode,game_seed) do update
      set max_day=greatest(public.market_seed_progress.max_day,excluded.max_day);
  end if;
  return new;
end $$;
revoke all on function public.track_market_progress() from public,anon,authenticated;
create trigger track_market_progress after insert or update of current_day,game_seed,game_mode
on public.game_sessions for each row execute function public.track_market_progress();

create or replace function public.start_new_game_with_mode(target_game_mode text default 'infinite')
returns public.game_sessions language plpgsql security definer set search_path = '' as $$
declare s public.game_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_game_mode is null or target_game_mode not in ('infinite','limited_30') then raise exception 'Invalid game mode'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  update public.game_sessions set status='paused' where user_id=auth.uid() and status='active';
  insert into public.game_sessions(user_id,game_mode,game_seed,trusted_state)
    values(auth.uid(),target_game_mode,upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),true)
    returning * into s;
  return s;
end $$;

create or replace function public.restore_save_slot(p_slot_id uuid)
returns public.game_sessions language plpgsql security definer set search_path = '' as $$
declare slot public.save_slots%rowtype; snapshot public.game_sessions%rowtype;
  s public.game_sessions%rowtype; reward_delta numeric; seen_day integer; keeps_rank boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform 1 from public.profiles where id=auth.uid() for update;
  select * into slot from public.save_slots where id=p_slot_id and user_id=auth.uid();
  if not found then raise exception 'Save slot not found'; end if;
  snapshot := jsonb_populate_record(null::public.game_sessions,coalesce(slot.session_snapshot,'{}'));
  reward_delta := greatest(0,coalesce((select sum(amount) from public.level_reward_receipts
    where user_id=auth.uid() and lineage_id=snapshot.lineage_id),0)-slot.reward_total);
  select max_day into seen_day from public.market_seed_progress
    where user_id=auth.uid() and game_mode=slot.game_mode and game_seed=slot.game_seed;
  keeps_rank := coalesce(snapshot.ranked,slot.ranked,false) and coalesce(snapshot.trusted_state,false)
    and slot.game_day>=coalesce(seen_day,0);
  -- Lock the abandoned timeline before branching; concurrent operations then fail as stale.
  perform 1 from public.game_sessions where user_id=auth.uid() and status='active' for update;
  update public.game_sessions set status='paused' where user_id=auth.uid() and status='active';
  insert into public.game_sessions(user_id,game_mode,game_seed,current_day,cash_balance,net_worth,portfolio_value,
    bills_paid_through_day,market_phase,advisor_ids,lineage_id,trusted_state,cash_streak,gain_streak,
    ranked,market_engine,market_seed_secret)
  values(auth.uid(),slot.game_mode,slot.game_seed,slot.game_day,slot.cash_balance+reward_delta,slot.net_worth+reward_delta,
    greatest(0,slot.net_worth-slot.cash_balance),coalesce(snapshot.bills_paid_through_day,(slot.game_day/7)*7),
    coalesce(snapshot.market_phase,'market_open'),coalesce(snapshot.advisor_ids,'{}'),coalesce(snapshot.lineage_id,gen_random_uuid()),
    keeps_rank,coalesce(snapshot.cash_streak,0),coalesce(snapshot.gain_streak,0),
    keeps_rank,coalesce(snapshot.market_engine,slot.market_engine,1),coalesce(snapshot.market_seed_secret,false)) returning * into s;
  -- Copy already-observed market data rather than regenerating a different
  -- history after a generator or credential change. Never copy future days.
  if snapshot.id is not null and exists(select 1 from public.game_sessions original
      where original.id=snapshot.id and original.user_id=auth.uid()
        and original.market_fingerprint=public.market_fingerprint_for(s.game_mode,s.game_seed,s.market_engine)) then
    insert into public.session_stock_prices
      select s.id,p.game_day,p.symbol,p.open_price,p.high_price,p.low_price,p.close_price,p.volume,p.event_impact
      from public.session_stock_prices p where p.session_id=snapshot.id and p.game_day<=s.current_day;
    insert into public.session_market_news
      select s.id,n.game_day,n.items from public.session_market_news n
      where n.session_id=snapshot.id and n.game_day<=s.current_day;
    insert into public.session_quotes(session_id,game_day,symbol,price)
      select s.id,p.game_day,p.symbol,p.close_price from public.session_stock_prices p
      where p.session_id=s.id;
    update public.game_sessions set market_generated_through=least(coalesce(snapshot.market_generated_through,0),s.current_day),
      market_fingerprint=public.market_fingerprint_for(s.game_mode,s.game_seed,s.market_engine) where id=s.id;
  end if;
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
  select * into s from public.game_sessions where id=s.id;
  return s;
end $$;


create or replace function public.achievement_eligible(achievement text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare s public.game_sessions%rowtype; held integer; sectors integer; trades integer; watched integer;
begin
  select * into s from public.game_sessions where user_id=auth.uid() and status='active' order by updated_at desc limit 1;
  if not found or not s.trusted_state or not s.ranked then return false; end if;
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

-- Both claim paths now use the same exact, run-scoped thresholds.
create or replace function public.claim_achievements(target_session_id uuid,p_achievement_ids text[])
returns text[] language plpgsql security definer set search_path='' as $$
declare wanted text; granted text[] := '{}';
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform 1 from public.game_sessions
    where id=target_session_id and user_id=auth.uid() and status='active' for update;
  if not found then raise exception 'Active game session not found'; end if;
  perform public.refresh_session_value(target_session_id);
  foreach wanted in array coalesce(p_achievement_ids,'{}') loop
    if public.achievement_eligible(wanted) then
      insert into public.user_achievement_unlocks(user_id,achievement_id)
        values(auth.uid(),wanted) on conflict do nothing;
    end if;
    if exists(select 1 from public.user_achievement_unlocks where user_id=auth.uid() and achievement_id=wanted) then
      granted:=array_append(granted,wanted);
    end if;
  end loop;
  return granted;
end $$;

create or replace function public.get_30_day_leaderboard(p_limit integer default 50)
returns table(run_id uuid,user_id uuid,best_net_worth numeric,return_pct numeric,completed_at timestamptz,
 username text,display_name text,avatar_url text,total_xp bigint)
language sql stable security definer set search_path = '' as $$
 select r.run_id,r.user_id,r.net_worth,round((r.net_worth-r.starting_cash)/nullif(r.starting_cash,0)*100,2),
 r.completed_at,p.username,p.display_name,p.avatar_url,public.player_total_xp(r.user_id)
 from public.challenge_results r join public.profiles p on p.id=r.user_id
 join public.game_sessions s on s.id=r.run_id where s.ranked and s.trusted_state
 order by r.net_worth desc,r.completed_at asc limit greatest(1,least(coalesce(p_limit,50),100));
$$;


commit;
