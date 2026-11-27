-- V4-03 check: the 8 Oct gameplay fix ("SQL c", 202610080005) is on the
-- database, and Jonas's 21 Nov rules (news before trading, action daily goals,
-- engine 4) survived it.
--
-- Paste into the Supabase SQL editor and run it as it is, before and after
-- supabase/run_all_2026-11-27.sql. It changes nothing: two made-up players and
-- their run exist only inside this transaction, and it ends with ROLLBACK.
-- Every check prints NOTICE "PASS ..."; the first failure stops with
-- ERROR "FAIL ...". Before the upgrade it stops at the first check, before
-- anything is inserted.

begin;

-- ── 1. Structure ────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.learning_entries') is null
     or to_regclass('public.account_flows') is null
     or to_regclass('public.trade_operations') is null then
    raise exception 'FAIL V4-03: SQL c tables missing (learning_entries, account_flows, trade_operations)';
  end if;
  if exists (select 1 from pg_class
             where oid in ('public.learning_entries'::regclass, 'public.account_flows'::regclass, 'public.trade_operations'::regclass)
               and not relrowsecurity) then
    raise exception 'FAIL V4-03: an SQL c table has row level security off';
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'game_sessions' and column_name = 'market_phase') then
    raise exception 'FAIL V4-03: game_sessions.market_phase missing (market close is only kept in one browser)';
  end if;
  if to_regprocedure('public.close_market(uuid, integer)') is null
     or to_regprocedure('public.execute_trade_checked(uuid, text, text, integer, integer, uuid)') is null
     or to_regprocedure('public.get_account_breakdown(uuid)') is null then
    raise exception 'FAIL V4-03: SQL c functions missing';
  end if;
  if has_function_privilege('anon', 'public.close_market(uuid, integer)', 'execute')
     or has_function_privilege('anon', 'public.execute_trade_checked(uuid, text, text, integer, integer, uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.close_market(uuid, integer)', 'execute') then
    raise exception 'FAIL V4-03: wrong EXECUTE grants on close_market / execute_trade_checked';
  end if;
  if has_table_privilege('anon', 'public.learning_entries', 'select')
     or has_table_privilege('anon', 'public.account_flows', 'select') then
    raise exception 'FAIL V4-03: visitors have a SELECT grant on learning_entries or account_flows';
  end if;
  raise notice 'PASS V4-03: SQL c tables, column, functions and grants are there';
end $$;

do $$
begin
  -- 202611210001: today's articles are readable before trading (Jonas, 21 Nov).
  if not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'session_market_news'
                   and policyname = 'Players read own run news'
                   and qual like '%game_day <= s.current_day%' and qual not like '%after_hours%') then
    raise exception 'FAIL V4-03: news policy is not the 21 Nov one (SQL c replaced it?)';
  end if;
  -- 202611210002: action daily goals on Toronto dates (Jonas, 21 Nov).
  if not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'user_daily_goal_completions'
                   and policyname = 'Users own their daily goal completions'
                   and with_check like '%goal_date%' and with_check like '%hold2%' and with_check like '%cash20%') then
    raise exception 'FAIL V4-03: daily-goal policy is not the 21 Nov one (SQL c replaced it?)';
  end if;
  -- 202611210004: new runs use engine 4.
  if (select column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'game_sessions' and column_name = 'market_engine') is distinct from '4' then
    raise exception 'FAIL V4-03: new runs do not default to market engine 4';
  end if;
  raise notice 'PASS V4-03: the 21 Nov news, daily-goal and engine rules are in place';
end $$;

-- ── 2. Behaviour, with two made-up players ─────────────────────────────────
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-0000000003a1', 'v4-03-player-a@example.invalid'),
  ('b0000000-0000-4000-8000-0000000003b2', 'v4-03-player-b@example.invalid');

-- Player A starts a run and saves a learning note ("Learning notes aren't available yet" before SQL c).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-0000000003a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-0000000003a1', true);
do $$
declare run public.game_sessions;
begin
  select * into run from public.start_new_game_with_mode('infinite');
  perform set_config('v403.run', run.id::text, true);
  insert into public.learning_entries (user_id, session_id, game_day, kind, decision, evidence)
  values (auth.uid(), run.id, run.current_day, 'research', 'consider', 'Checked the earnings report and the sector news first.');
  raise notice 'PASS V4-03: player A started a run and saved a learning note';
end $$;
reset role;

do $$
declare run_id uuid := current_setting('v403.run')::uuid;
begin
  if not exists (select 1 from public.account_flows where session_id = run_id and kind = 'opening') then
    raise exception 'FAIL V4-03: a new run has no opening account flow (Dashboard breakdown)';
  end if;
  insert into public.session_market_news (session_id, game_day, items)
  values (run_id, 1, '[{"newsId": "v4-03-check", "gameDay": 1}]'::jsonb)
  on conflict do nothing;
  raise notice 'PASS V4-03: the run has its opening flow';
end $$;

-- Player A reads today's news while the market is open (21 Nov rule).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-0000000003a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-0000000003a1', true);
do $$
begin
  if not exists (select 1 from public.session_market_news
                 where session_id = current_setting('v403.run')::uuid and game_day = 1) then
    raise exception 'FAIL V4-03: player A cannot read today''s news before trading';
  end if;
  raise notice 'PASS V4-03: today''s news is readable before trading';
end $$;

-- Player B sees none of A's notes, money flows or news, and cannot close A's market.
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-0000000003b2","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-0000000003b2', true);
do $$
declare run_id uuid := current_setting('v403.run')::uuid; n integer; refused text;
begin
  select (select count(*) from public.learning_entries where session_id = run_id)
       + (select count(*) from public.account_flows where session_id = run_id)
       + (select count(*) from public.session_market_news where session_id = run_id)
    into n;
  if n <> 0 then
    raise exception 'FAIL V4-03: player B can read % row(s) of player A''s run', n;
  end if;
  begin
    perform public.close_market(run_id, 1);
  exception when others then
    refused := sqlerrm;
  end;
  if refused is null then
    raise exception 'FAIL V4-03: player B closed player A''s market';
  end if;
  raise notice 'PASS V4-03: player B cannot read or close player A''s run';
end $$;

-- Player A closes the market: it is stored on the run (every browser sees it), and trading stops.
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-0000000003a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-0000000003a1', true);
do $$
declare run_id uuid := current_setting('v403.run')::uuid; refused text;
begin
  perform public.close_market(run_id, 1);
  if (select market_phase from public.game_sessions where id = run_id) is distinct from 'after_hours' then
    raise exception 'FAIL V4-03: closing the market was not stored on the run';
  end if;
  begin
    perform public.execute_trade_checked(run_id, 'CAI', 'buy', 1, 1, gen_random_uuid());
  exception when others then
    refused := sqlerrm;
  end;
  if refused is null then
    raise exception 'FAIL V4-03: a trade went through after the close';
  end if;
  if refused not like 'The market is closed%' then
    raise exception 'FAIL V4-03: a trade after the close failed with "%" instead of "The market is closed"', refused;
  end if;
  raise notice 'PASS V4-03: the close is stored on the run and refuses trades';
end $$;
reset role;

rollback;
