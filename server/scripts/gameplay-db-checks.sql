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

-- Today's news is visible while trading; tomorrow's news and prices stay hidden.
insert into public.session_market_news (session_id, game_day, items)
select r.id, d, jsonb_build_array(jsonb_build_object('newsId', 'day-' || d, 'gameDay', d))
from run r, generate_series(1, 3) d;
update public.session_stock_prices p set close_price = 110, high_price = 110
from run r where p.session_id = r.id and p.game_day = 2;
set role authenticated;
insert into checks select 'day 1 news visible before trading', count(*) = 1 and min(game_day) = 1
from public.session_market_news where session_id = (select id from run);
insert into checks select 'future prices hidden while open', max(game_day) = 1
from public.session_stock_prices where session_id = (select id from run);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into checks select 'another player cannot read this run news', count(*) = 0
from public.session_market_news where session_id = (select id from run);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
reset role;

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
do $$ begin
  perform public.execute_trade_checked((select id from run), (select symbol from sym), 'sell', 1, 1, gen_random_uuid());
  insert into checks values ('sell refused after hours', false);
exception when others then insert into checks values ('sell refused after hours', sqlerrm like 'The market is closed%'); end $$;
insert into checks select 'close preserves today news without revealing tomorrow', count(*) = 1 and min(game_day) = 1
from public.session_market_news where session_id = (select id from run);
insert into checks select 'close preserves today prices', min(close_price) = 100 and max(game_day) = 1
from public.session_stock_prices where session_id = (select id from run);
-- Daily goals use automatic evidence rather than written notes.
do $$ begin
  insert into public.user_daily_goal_completions (user_id, session_id, game_day, goal_id)
  values (auth.uid(), (select id from run), 1, 'hold2');
  insert into checks values ('holding goal without two companies refused', false);
exception when others then insert into checks values ('holding goal without two companies refused', true); end $$;
insert into public.user_daily_goal_completions (user_id, session_id, game_day, goal_id)
values (auth.uid(), (select id from run), 1, 'cash20');
insert into checks values ('cash goal without a written response accepted', true);
-- save
create temp table slot as select * from public.create_save_slot((select id from run), 'Test save');
grant select on slot to authenticated;
reset role;
insert into checks select 'save keeps advisors', (select advisor_ids = '{riley}' from slot);

-- advance: market reopens, bill flow at day 7
select public.server_advance_game_day('00000000-0000-0000-0000-00000000000a', (select id from run), 2);
insert into checks select 'advance reopens market', (select g.market_phase = 'market_open' and g.current_day = 2 from public.game_sessions g join run r on r.id = g.id);
insert into checks select 'advance revalues held shares at new prices', g.net_worth = g.cash_balance + 11 * 110
from public.game_sessions g join run r on r.id = g.id;
set role authenticated;
insert into checks select 'advance publishes next day articles and retains history', count(*) = 2 and max(game_day) = 2
from public.session_market_news where session_id = (select id from run);
insert into checks select 'advance reveals new prices without future prices', max(game_day) = 2 and max(close_price) = 110
from public.session_stock_prices where session_id = (select id from run);
insert into checks select 'buy works after reopening',
  (public.execute_trade_checked((select id from run), (select symbol from sym), 'buy', 2, 1, gen_random_uuid())->>'quantity')::numeric = 12;
insert into checks select 'sell works after reopening',
  (public.execute_trade_checked((select id from run), (select symbol from sym), 'sell', 2, 1, gen_random_uuid())->>'quantity')::numeric = 11;
reset role;
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

-- Repeat the permission and news sequence in the 30-Day Challenge.
set role authenticated;
create temp table challenge as select * from public.start_new_game_with_mode('limited_30');
grant select on challenge to authenticated;
reset role;
insert into public.session_stock_prices (session_id, game_day, symbol, open_price, high_price, low_price, close_price, volume)
select c.id, d, s.symbol, 100, 110, 100, case when d = 1 then 100 else 110 end, 1000
from challenge c, generate_series(1, 2) d, sym s;
insert into public.session_market_news (session_id, game_day, items)
select c.id, d, jsonb_build_array(jsonb_build_object('newsId', 'challenge-' || d, 'gameDay', d))
from challenge c, generate_series(1, 2) d;
update public.game_sessions g set market_generated_through = 2,
  market_fingerprint = public.market_fingerprint_for(g.game_mode, g.game_seed, g.market_engine)
from challenge c where g.id = c.id;
set role authenticated;
insert into checks select 'challenge: news before first trade, future news hidden', count(*) = 1 and min(game_day) = 1
from public.session_market_news where session_id = (select id from challenge);
insert into checks select 'challenge: buy while open',
  (public.execute_trade_checked((select id from challenge), (select symbol from sym), 'buy', 1, 1, gen_random_uuid())->>'quantity')::numeric = 1;
select public.close_market((select id from challenge), 1);
do $$ declare side text; begin
  foreach side in array array['buy', 'sell'] loop
    begin
      perform public.execute_trade_checked((select id from challenge), (select symbol from sym), side, 1, 1, gen_random_uuid());
      insert into checks values ('challenge: closed market refuses ' || side, false);
    exception when others then
      insert into checks values ('challenge: closed market refuses ' || side, sqlerrm like 'The market is closed%');
    end;
  end loop;
end $$;
reset role;
select public.server_advance_game_day('00000000-0000-0000-0000-00000000000a', (select id from challenge), 2);
insert into checks select 'challenge: advance reopens and revalues portfolio',
  g.market_phase = 'market_open' and g.current_day = 2 and g.net_worth = g.cash_balance + 110
from public.game_sessions g join challenge c on c.id = g.id;
set role authenticated;
insert into checks select 'challenge: next day news before trading resumes', count(*) = 2 and max(game_day) = 2
from public.session_market_news where session_id = (select id from challenge);
insert into checks select 'challenge: sell after reopening',
  (public.execute_trade_checked((select id from challenge), (select symbol from sym), 'sell', 2, 1, gen_random_uuid())->>'quantity')::numeric = 0;
reset role;

-- Calendar-day goals: verified actions, date boundaries, and completion uniqueness.
set role authenticated;
insert into public.user_daily_goal_completions (user_id, session_id, game_day, goal_id)
values (auth.uid(), (select id from challenge), 2, 'buy1'), (auth.uid(), (select id from challenge), 2, 'sell1');
insert into checks select 'daily goals accept verified buy and sell without notes', count(*) = 2
from public.user_daily_goal_completions where session_id = (select id from challenge) and goal_id in ('buy1', 'sell1');
do $$ declare bad_date date; begin
  foreach bad_date in array array[(now() at time zone 'America/Toronto')::date - 1, (now() at time zone 'America/Toronto')::date + 1] loop
    begin
      insert into public.user_daily_goal_completions (user_id, session_id, game_day, goal_date, goal_id)
      values (auth.uid(), (select id from challenge), 2, bad_date, 'cash20');
      insert into checks values ('goal rejects non-current calendar date ' || bad_date, false);
    exception when insufficient_privilege then
      insert into checks values ('goal rejects non-current calendar date ' || bad_date, true);
    end;
  end loop;
end $$;
do $$ begin
  insert into public.user_daily_goal_completions (user_id, session_id, game_day, goal_id)
  values (auth.uid(), (select id from challenge), 2, 'learn_risk');
  insert into checks values ('writing goals are no longer accepted', false);
exception when insufficient_privilege then insert into checks values ('writing goals are no longer accepted', true); end $$;
reset role;
-- Watchlist and diversification goals also use saved actions as evidence.
insert into public.session_stock_prices (session_id, game_day, symbol, open_price, high_price, low_price, close_price, volume)
select c.id, 2, s.symbol, 100, 100, 100, 100, 1000
from challenge c, (select symbol from public.stocks where is_active order by symbol limit 2) s
on conflict (session_id, game_day, symbol) do nothing;
set role authenticated;
insert into public.user_watchlist (user_id, stock_id)
select auth.uid(), id from public.stocks where is_active order by symbol limit 2;
insert into public.user_daily_goal_completions (user_id, session_id, game_day, goal_id)
values (auth.uid(), (select id from challenge), 2, 'watch2');
insert into checks select 'watchlist goal completes automatically with two watched stocks', count(*) = 1
from public.user_daily_goal_completions where session_id = (select id from challenge) and goal_id = 'watch2';
select public.execute_trade_checked((select id from challenge), symbol, 'buy', 2, 1, gen_random_uuid())
from public.stocks where is_active order by symbol limit 2;
insert into public.user_daily_goal_completions (user_id, session_id, game_day, goal_id)
values (auth.uid(), (select id from challenge), 2, 'hold2');
insert into checks select 'holding goal completes automatically with two companies', count(*) = 1
from public.user_daily_goal_completions where session_id = (select id from challenge) and goal_id = 'hold2';
reset role;
-- A previous calendar day's completion must not block a new one on the same game day.
insert into public.user_daily_goal_completions (user_id, session_id, game_day, goal_date, goal_id)
select user_id, id, 2, (now() at time zone 'America/Toronto')::date - 1, 'cash20' from challenge;
set role authenticated;
insert into public.user_daily_goal_completions (user_id, session_id, game_day, goal_id)
values (auth.uid(), (select id from challenge), 2, 'cash20');
insert into checks select 'new calendar day can complete a goal without advancing game day', count(*) = 2
from public.user_daily_goal_completions where session_id = (select id from challenge) and goal_id = 'cash20';
reset role;
update public.game_sessions g set current_day = 3 from challenge c where g.id = c.id;
set role authenticated;
insert into public.user_daily_goal_completions (user_id, session_id, game_day, goal_id)
values (auth.uid(), (select id from challenge), 3, 'buy1')
on conflict (user_id, session_id, goal_date, goal_id) do nothing;
insert into checks select 'advancing game day cannot duplicate same calendar day completion', count(*) = 1
from public.user_daily_goal_completions where session_id = (select id from challenge) and goal_id = 'buy1';
reset role;
update public.trades t set executed_at = now() - interval '2 days' from challenge c where t.session_id = c.id;
set role authenticated;
delete from public.user_daily_goal_completions where session_id = (select id from challenge) and goal_id = 'buy1';
do $$ begin
  insert into public.user_daily_goal_completions (user_id, session_id, game_day, goal_id)
  values (auth.uid(), (select id from challenge), 3, 'buy1');
  insert into checks values ('yesterday trades cannot complete today goals', false);
exception when insufficient_privilege then insert into checks values ('yesterday trades cannot complete today goals', true); end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  insert into public.user_daily_goal_completions (user_id, session_id, game_day, goal_id)
  values (auth.uid(), (select id from challenge), 3, 'cash20');
  insert into checks values ('cannot complete goals in another player run', false);
exception when insufficient_privilege then insert into checks values ('cannot complete goals in another player run', true); end $$;
reset role;

select name, ok from checks;
select count(*) filter (where not ok) as failed, count(*) as total from checks;
