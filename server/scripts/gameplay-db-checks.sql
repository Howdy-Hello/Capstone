-- Behaviour checks for the gameplay functions (202610080005 and the live
-- fixes it builds on). Run by test-gameplay-db.mjs; every row must be ok.
create temp table checks (name text, ok boolean);
grant all on checks to authenticated, service_role;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'a@test');
insert into public.profiles (id, username) values ('00000000-0000-0000-0000-00000000000a', 'tester') on conflict (id) do nothing;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

create temp table run as select * from public.start_new_game_with_mode('infinite');
reset role;

-- The API server generates the market; do it by hand for days 1-3.
insert into public.session_stock_prices (session_id, game_day, symbol, open_price, high_price, low_price, close_price, volume)
select r.id, d, s.symbol, 100, 100, 100, 100, 1000
from run r, generate_series(1, 3) d, (select symbol from public.stocks where is_active order by symbol limit 2) s;
update public.game_sessions g set market_generated_through = 3,
  market_fingerprint = public.market_fingerprint_for(g.game_mode, g.game_seed, g.market_engine)
from run r where g.id = r.id;

insert into checks select 'opening flow on new run', exists(select 1 from public.account_flows f join run r on r.id = f.session_id where f.kind = 'opening');
create temp table sym as select symbol from public.stocks where is_active order by symbol limit 1;
grant select on run, sym to authenticated;

set role authenticated;
-- one large buy vs the same quantity in two orders: same total cost (BUG-016)
create temp table t1 as select public.execute_trade_checked((select id from run), (select symbol from sym), 'buy', 1, 6, gen_random_uuid()) r;
create temp table t2 as select public.execute_trade_checked((select id from run), (select symbol from sym), 'buy', 1, 6, gen_random_uuid()) r;
grant select on t1, t2 to authenticated;
reset role;
insert into checks select 'second split order pays more slippage', (select (r->>'total')::numeric from t2) > (select (r->>'total')::numeric from t1);
-- 12 shares at $100 = 1200 of 2000 -> ratio .6 -> 12% cap -> 1344 total
insert into checks select 'split total within 1% of one order (1344)', abs((select (r->>'total')::numeric from t1) + (select (r->>'total')::numeric from t2) - 1344) < 13.44;
insert into checks select 'average cost kept unrounded (BUG-025)', (select scale(average_purchase_price) from public.holdings h join run r on r.id = h.session_id) = 6;
insert into checks select 'execution_price returned', (select r ? 'execution_price' from t1);

set role authenticated;
-- idempotent retry
do $$ declare op uuid := gen_random_uuid(); a jsonb; b jsonb; begin
  a := public.execute_trade_checked((select id from run), (select symbol from sym), 'sell', 1, 1, op);
  b := public.execute_trade_checked((select id from run), (select symbol from sym), 'sell', 1, 1, op);
  insert into checks values ('retry returns first result', a = b);
end $$;
do $$ begin
  perform public.execute_trade_checked((select id from run), (select symbol from sym), 'buy', 2, 1, gen_random_uuid());
  insert into checks values ('stale day refused', false);
exception when others then insert into checks values ('stale day refused', sqlerrm like 'Your game has changed%'); end $$;

-- hire advisor
select public.hire_advisor((select id from run), 1, 'riley');
select public.hire_advisor((select id from run), 1, 'riley');
reset role;
insert into checks select 'advisor stored once, charged once',
  (select g.advisor_ids = '{riley}' from public.game_sessions g join run r on r.id = g.id)
  and (select count(*) = 1 from public.account_flows f join run r on r.id = f.session_id where f.kind = 'advisor');

-- advance needs a closed market
do $$ begin
  perform public.server_advance_game_day('00000000-0000-0000-0000-00000000000a', (select id from run), 2);
  insert into checks values ('advance refused while open', false);
exception when others then insert into checks values ('advance refused while open', sqlerrm like 'Close the market%'); end $$;

set role authenticated;
select public.close_market((select id from run), 1);
do $$ begin
  perform public.execute_trade_checked((select id from run), (select symbol from sym), 'buy', 1, 1, gen_random_uuid());
  insert into checks values ('trade refused after hours', false);
exception when others then insert into checks values ('trade refused after hours', sqlerrm like 'The market is closed%'); end $$;
-- learning goal needs a note
do $$ begin
  insert into public.user_daily_goal_completions (user_id, session_id, game_day, goal_id)
  values (auth.uid(), (select id from run), 1, 'learn_risk');
  insert into checks values ('learn goal without note refused', false);
exception when others then insert into checks values ('learn goal without note refused', true); end $$;
insert into public.learning_entries (user_id, session_id, game_day, kind, decision, evidence)
values (auth.uid(), (select id from run), 1, 'risk', 'avoid', 'Debt is high and the sector is cyclical for my cash needs.');
insert into public.user_daily_goal_completions (user_id, session_id, game_day, goal_id)
values (auth.uid(), (select id from run), 1, 'learn_risk');
insert into checks values ('learn goal with note accepted', true);
-- save
create temp table slot as select * from public.create_save_slot((select id from run), 'Test save');
grant select on slot to authenticated;
reset role;
insert into checks select 'save keeps advisors', (select advisor_ids = '{riley}' from slot);

-- advance: market reopens, bill flow at day 7
select public.server_advance_game_day('00000000-0000-0000-0000-00000000000a', (select id from run), 2);
insert into checks select 'advance reopens market', (select g.market_phase = 'market_open' and g.current_day = 2 from public.game_sessions g join run r on r.id = g.id);
update public.game_sessions g set market_fingerprint = 'other' from run r where g.id = r.id;
update public.game_sessions g set market_phase = 'after_hours' from run r where g.id = r.id;
do $$ begin
  perform public.server_advance_game_day('00000000-0000-0000-0000-00000000000a', (select id from run), 3);
  insert into checks values ('fingerprint mismatch refused (BUG-014)', false);
exception when others then insert into checks values ('fingerprint mismatch refused (BUG-014)', sqlerrm like 'Market data%'); end $$;
update public.game_sessions g set market_fingerprint = public.market_fingerprint_for(g.game_mode, g.game_seed, g.market_engine), market_generated_through = 7 from run r where g.id = r.id;
insert into public.session_stock_prices (session_id, game_day, symbol, open_price, high_price, low_price, close_price, volume)
select r.id, d, s.symbol, 100, 100, 100, 100, 1000
from run r, generate_series(4, 7) d, (select symbol from public.stocks where is_active order by symbol limit 2) s;
select public.server_advance_game_day('00000000-0000-0000-0000-00000000000a', (select id from run), 7);
insert into checks select 'bill recorded as living_cost', (select coalesce(sum(amount), 0) = -100 from public.account_flows f join run r on r.id = f.session_id where f.kind = 'living_cost');

-- restore: back to day 1, market open, flows restart
set role authenticated;
select public.restore_save_slot((select id from slot));
reset role;
insert into checks select 'restore resets day/phase/advisors', (select g.current_day = 1 and g.market_phase = 'market_open' and g.advisor_ids = '{riley}' from public.game_sessions g join run r on r.id = g.id);
insert into checks select 'restore restarts flows', (select count(*) = 1 from public.account_flows f join run r on r.id = f.session_id);

-- BUG-035: unranked endless run is not paid level cash
update public.game_sessions g set ranked = false from run r where g.id = r.id;
update public.profiles set last_level_reward_processed = 1 where id = '00000000-0000-0000-0000-00000000000a';
set role authenticated;
create temp table lv as select public.process_level_cash_rewards((select id from run)) r;
grant select on lv to authenticated;
reset role;
insert into checks select 'unranked run gets no level cash (BUG-035)', (select (r->>'cash_reward')::numeric = 0 from lv);

-- account breakdown readable by owner only
set role authenticated;
insert into checks select 'breakdown readable', (select count(*) > 0 from public.get_account_breakdown((select id from run)));
reset role;

-- old client path still works
set role authenticated;
select public.create_save_slot('Old client save');
reset role;
insert into checks select 'create_save_slot(text) still works', (select count(*) = 2 from public.save_slots where user_id = '00000000-0000-0000-0000-00000000000a');

-- BUG-050: skipping the client reward RPC in an ineligible run must not let
-- a player defer cash until a ranked endless run. Test both ineligible modes.
insert into public.user_achievement_unlocks (user_id, achievement_id)
values ('00000000-0000-0000-0000-00000000000a', 'first_trade') on conflict do nothing;
create temp table reward_cases (mode text, ranked boolean);
insert into reward_cases values ('infinite', false), ('limited_30', true);
do $$
declare reward_case record; before_cash numeric; payout jsonb;
begin
  for reward_case in select * from reward_cases loop
    update public.profiles set last_level_reward_processed = 1
    where id = '00000000-0000-0000-0000-00000000000a';
    update public.game_sessions g
    set game_mode = reward_case.mode, ranked = reward_case.ranked,
        current_day = 1, market_phase = 'after_hours',
        market_fingerprint = public.market_fingerprint_for(reward_case.mode, g.game_seed, g.market_engine)
    from run r where g.id = r.id;
    select g.cash_balance into before_cash from public.game_sessions g join run r on r.id = g.id;
    perform public.server_advance_game_day('00000000-0000-0000-0000-00000000000a', (select id from run), 2);
    insert into checks select reward_case.mode || ': advance consumes pending levels without client RPC',
      last_level_reward_processed = public.player_level_from_xp(public.player_total_xp(id))
      and last_level_reward_processed > 1
    from public.profiles where id = '00000000-0000-0000-0000-00000000000a';
    insert into checks select reward_case.mode || ': consuming levels pays no cash', g.cash_balance = before_cash
    from public.game_sessions g join run r on r.id = g.id;
    update public.game_sessions g set game_mode = 'infinite', ranked = true
    from run r where g.id = r.id;
    payout := public.process_level_cash_rewards((select id from run));
    insert into checks values (reward_case.mode || ': later ranked run cannot cash deferred levels', (payout->>'cash_reward')::numeric = 0);
  end loop;
end $$;

-- Ranked endless runs still leave pending levels available for the cash RPC.
update public.profiles set last_level_reward_processed = 1
where id = '00000000-0000-0000-0000-00000000000a';
update public.game_sessions g set game_mode = 'infinite', ranked = true,
  market_phase = 'after_hours',
  market_fingerprint = public.market_fingerprint_for('infinite', g.game_seed, g.market_engine)
from run r where g.id = r.id;
select public.server_advance_game_day('00000000-0000-0000-0000-00000000000a', (select id from run), 3);
insert into checks select 'ranked endless advance preserves pending cash rewards', last_level_reward_processed = 1
from public.profiles where id = '00000000-0000-0000-0000-00000000000a';
set role authenticated;
insert into checks select 'ranked endless reward still pays', (public.process_level_cash_rewards((select id from run))->>'cash_reward')::numeric > 0;
reset role;

select name, ok from checks;
select count(*) filter (where not ok) as failed, count(*) as total from checks;
