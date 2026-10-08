process.on('uncaughtException', e => { console.error(e.message, e.query ?? '', e.where ?? ''); process.exit(1); });
// Run with: node server/scripts/test-gameplay-db.mjs /path/to/@electric-sql/pglite/dist/index.js
// Uses a disposable PostgreSQL engine; never connects to a deployed database.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { PGlite } = await import(process.argv[2] ?? '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon,service_role;
 grant execute on function auth.uid() to authenticated,anon,service_role;
 create schema storage;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid,name text,bucket_id text,owner_id text);
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 alter default privileges in schema public grant all on tables to authenticated,anon,service_role;
 alter default privileges in schema public grant all on sequences to authenticated,anon,service_role;
`);
const migrations = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations');
for (const name of (await fs.readdir(migrations)).filter(n => n.endsWith('.sql')).sort()) {
  try { await db.exec(await fs.readFile(path.join(migrations, name),'utf8')); }
  catch (e) { console.error('Migration failed:',name,e.message); process.exit(1); }
}
console.log('All migrations applied to disposable PostgreSQL.');
const user = 'aaaaaaaa-0000-0000-0000-000000000001';
await db.query('insert into auth.users(id,email) values($1,$2)',[user,'test@example.test']);
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
const scalar = async (sql, params=[]) => (await db.query(sql,params)).rows[0];
const asUser = async (sql,params=[]) => {
  await db.exec('set role authenticated');
  try { return await scalar(sql,params); } finally { await db.exec('reset role'); }
};
const rejected = async (sql,params=[]) => assert.rejects(() => asUser(sql,params));
let run = await asUser("select * from public.start_new_game_with_mode('infinite')");
const quote = async (id,day,price=100) => {
  await db.query(`insert into public.session_quotes(session_id,game_day,symbol,price)
    values($1,$2,'CAI',$3) on conflict do nothing`,[id,day,price]);
  await db.query(`insert into public.session_stock_prices(session_id,game_day,symbol,open_price,high_price,low_price,close_price,volume,event_impact)
    values($1,$2,'CAI',$3,$3,$3,$3,1000,0) on conflict do nothing`,[id,day,price]);
  await db.query(`insert into public.session_market_news(session_id,game_day,items) values($1,$2,'[]') on conflict do nothing`,[id,day]);
  await db.query(`update public.game_sessions set market_generated_through=greatest(market_generated_through,$2),
    market_fingerprint=public.market_fingerprint_for(game_mode,game_seed,market_engine) where id=$1`,[id,day]);
};
await quote(run.id,1);
await rejected("select public.import_legacy_advisor($1)",[run.id]);
await rejected('update public.game_sessions set cash_balance=999999 where id=$1',[run.id]);
await rejected('update public.profiles set last_level_reward_processed=1 where id=$1',[user]);
await rejected("insert into public.user_achievement_unlocks(user_id,achievement_id) values($1,'market_master')",[user]);
await rejected("select public.execute_trade($1,'CAI','buy',1,1,1)",[run.id]);
const operation='bbbbbbbb-0000-0000-0000-000000000001';
const trade = await asUser("select public.execute_trade_checked($1,'CAI','buy',1,1,$2) as result",[run.id,operation]);
assert.equal(trade.result.cash,1900);
const repeated = await asUser("select public.execute_trade_checked($1,'CAI','buy',1,1,$2) as result",[run.id,operation]);
assert.deepEqual(repeated,trade);
assert.equal(Number((await scalar('select count(*) from public.trades where session_id=$1',[run.id])).count),1);
// Raw values below the cash threshold must not unlock, even if display rounds to 100%.
await db.query('update public.game_sessions set cash_balance=4975 where id=$1',[run.id]);
await rejected("insert into public.user_achievement_unlocks(user_id,achievement_id) values($1,'cash_builder')",[user]);
await db.query('update public.game_sessions set cash_balance=1900 where id=$1',[run.id]);
await asUser(`insert into public.trade_journal_entries(session_id,user_id,symbol,trade_type,quantity,execution_price,game_day,thesis)
 values($1,$2,'CAI','buy',1,100,1,'Original thesis')`,[run.id,user]);
await rejected("insert into public.user_daily_goal_completions(user_id,session_id,game_day,goal_id) values($1,$2,1,'learn_research')",[user,run.id]);
await asUser("insert into public.learning_entries(user_id,session_id,game_day,kind,decision,evidence) values($1,$2,1,'research','wait','Revenue is growing but valuation is uncertain; I will investigate margins.')",[user,run.id]);
await asUser("insert into public.user_daily_goal_completions(user_id,session_id,game_day,goal_id) values($1,$2,1,'learn_research')",[user,run.id]);
await rejected("insert into public.learning_entries(user_id,session_id,game_day,kind,decision,evidence) values($1,$2,2,'wait','wait','A sufficiently detailed reason on the wrong day.')",[user,run.id]);
await rejected("insert into public.account_flows(session_id,game_day,kind,amount) values($1,1,'reward',100000)",[run.id]);
const initialJournal=await scalar('select id from public.trade_journal_entries where session_id=$1',[run.id]);
await asUser("insert into public.learning_entries(user_id,session_id,game_day,kind,journal_id,decision,evidence,reflection) values($1,$2,1,'reflection',$3,'keep','I checked revenue and demand against my exit rule.','The position was small; a short-term price gain may have been luck.')",[user,run.id,initialJournal.id]);
await asUser('select public.close_market($1,1)',[run.id]);
const slot=await asUser("select * from public.create_save_slot($1,'Before hiring')",[run.id]);
await db.query('update public.game_sessions set cash_balance=50 where id=$1',[run.id]);
await rejected("select public.hire_advisor($1,1,'riley')",[run.id]);
assert.deepEqual((await scalar('select advisor_ids from public.game_sessions where id=$1',[run.id])).advisor_ids,[]);
await db.query('update public.game_sessions set cash_balance=1900 where id=$1',[run.id]);
await asUser("select public.hire_advisor($1,1,'riley')",[run.id]);
assert.equal(Number((await scalar('select cash_balance from public.game_sessions where id=$1',[run.id])).cash_balance),1800);
await asUser("select public.hire_advisor($1,1,'riley')",[run.id]);
assert.equal(Number((await scalar('select cash_balance from public.game_sessions where id=$1',[run.id])).cash_balance),1800);
assert.equal(Number((await scalar("select sum(amount) as amount from public.account_flows where session_id=$1 and kind='advisor'",[run.id])).amount),-100, 'Repeated hiring must not duplicate spending');
const hiredSlot=await asUser("select * from public.create_save_slot($1,'Hired')",[run.id]);
await asUser(`insert into public.trade_journal_entries(session_id,user_id,symbol,trade_type,quantity,execution_price,game_day,thesis)
 values($1,$2,'CAI','buy',1,100,1,'Abandoned thesis')`,[run.id,user]);
await quote(run.id,2,110);
assert.equal(Number((await asUser('select count(*) from public.session_quotes where session_id=$1 and game_day=2',[run.id])).count),0,
  'Prepared future quotes must stay hidden until the day is committed');
await asUser("select public.advance_game_day($1,2,'infinite')",[run.id]);
assert.equal(Number((await asUser('select count(*) from public.session_quotes where session_id=$1 and game_day=2',[run.id])).count),1);
await rejected("select public.execute_trade_checked($1,'CAI','sell',1,1,gen_random_uuid())",[run.id]);
await rejected("select public.advance_game_day($1,1,'infinite')",[run.id]);
await asUser("select public.claim_achievements($1,array['first_trade'])",[run.id]);
const reward=await asUser('select public.process_level_cash_rewards($1) as result',[run.id]);
assert.equal(reward.result.cash_reward,50);
let restored=await asUser('select * from public.restore_save_slot($1)',[slot.id]);
assert.notEqual(restored.id,run.id);
assert.equal(restored.current_day,1);
assert.equal(Number(restored.cash_balance),1950);
assert.equal(restored.market_phase,'after_hours');
assert.equal(restored.market_engine,run.market_engine);
assert.equal(restored.market_seed_secret,run.market_seed_secret);
assert.equal(restored.market_fingerprint,`${run.game_mode}:${run.game_seed}:v2`);
assert.equal(restored.market_generated_through,1);
assert.equal(restored.ranked,false,'A rewind after seeing Day 2 is practice-only');
assert.equal(restored.trusted_state,false,'Practice branches must not earn competitive achievements');
assert.equal(Number((await scalar('select max_day from public.market_seed_progress where user_id=$1 and game_mode=$2 and game_seed=$3',[user,run.game_mode,run.game_seed])).max_day),2);
assert.equal(Number((await scalar('select close_price from public.session_stock_prices where session_id=$1 and game_day=1',[restored.id])).close_price),100);
assert.equal(Number((await scalar('select count(*) from public.session_stock_prices where session_id=$1 and game_day>1',[restored.id])).count),0);
assert.equal(Number((await scalar('select price from public.session_quotes where session_id=$1 and game_day=1',[restored.id])).price),100);
await rejected("insert into public.user_achievement_unlocks(user_id,achievement_id) values($1,'active_trader')",[user]);
const practiceClaims=await asUser("select public.claim_achievements($1,array['active_trader','cash_discipline']) as earned",[restored.id]);
assert.deepEqual(practiceClaims.earned,[]);
assert.equal(Number((await scalar("select count(*) from public.learning_entries e join public.trade_journal_entries j on j.id=e.journal_id where e.session_id=$1 and j.session_id=$1 and e.kind='reflection'",[restored.id])).count),1);
assert.equal(Number((await scalar('select count(*) from public.learning_entries where session_id=$1',[restored.id])).count),2);
assert.equal(Number((await scalar("select sum(amount) as amount from public.account_flows where session_id=$1 and kind='reward'",[restored.id])).amount),50);
assert.deepEqual(restored.advisor_ids,[]);
const journal = (await db.query('select thesis from public.trade_journal_entries where session_id=$1',[restored.id])).rows;
assert.deepEqual(journal.map(j=>j.thesis),['Original thesis']);
assert.equal(Number((await scalar('select count(*) from public.user_daily_goal_completions where session_id=$1',[restored.id])).count),1);

assert.equal(Number((await scalar('select count(*) from public.trades where session_id=$1',[restored.id])).count),1);
restored=await asUser('select * from public.restore_save_slot($1)',[hiredSlot.id]);
assert.equal(Number(restored.cash_balance),1850);
assert.deepEqual(restored.advisor_ids,['riley']);
const again=await asUser('select * from public.restore_save_slot($1)',[slot.id]);
assert.equal(Number(again.cash_balance),1950, 'Repeated restore must not duplicate rewards');
await rejected("select public.execute_trade_checked($1,'CAI','buy',1,1,gen_random_uuid())",[restored.id]);
// A final result survives branching, and that lineage cannot submit twice.
run=await asUser("select * from public.start_new_game_with_mode('limited_30')");
assert.equal(Number((await scalar('select count(*) from public.user_daily_goal_completions where session_id=$1',[run.id])).count),0);
await db.query("update public.game_sessions set current_day=29,market_phase='after_hours' where id=$1",[run.id]);
await quote(run.id,29);await quote(run.id,30);
await asUser("select public.advance_game_day($1,30,'limited_30')",[run.id]);
await rejected("select public.execute_trade_checked($1,'CAI','buy',30,1,gen_random_uuid())",[run.id]);
await rejected("select public.hire_advisor($1,30,'riley')",[run.id]);
assert.equal(Number((await scalar('select count(*) from public.challenge_results')).count),1);
const finalSlot=await asUser("select * from public.create_save_slot($1,'Finished')",[run.id]);
const finalBranch=await asUser('select * from public.restore_save_slot($1)',[finalSlot.id]);
await quote(finalBranch.id,30);
await asUser('select public.refresh_session_value($1)',[finalBranch.id]);
assert.equal(Number((await scalar('select count(*) from public.challenge_results')).count),1);
const board=(await db.query('select * from public.get_30_day_leaderboard(50)')).rows;
assert.equal(board.length,1,'Final save restores must not duplicate a leaderboard result');
assert.equal(board[0].run_id,run.id);
await asUser('select public.restore_save_slot($1)',[slot.id]);
assert.equal(Number((await scalar('select count(*) from public.challenge_results')).count),1);
console.log('Gameplay integrity checks passed: permissions, thresholds, quotes, idempotency, stale days, advisors, snapshots, rewards, and final results.');
// A full cash-only learning session needs no stock purchases, and a flat
// market bill is tracked as spending even when only part of it can be paid.
const previousInfinite=await asUser("select * from public.start_new_game_with_mode('infinite')");
const learningRun = await asUser("select * from public.start_new_game_with_mode('infinite')");
assert.notEqual(learningRun.game_seed,previousInfinite.game_seed,'Each infinite run needs its own market');
assert.equal(learningRun.market_engine,2);
await db.query('update public.game_sessions set cash_streak=5,gain_streak=3 where id=$1',[learningRun.id]);
const streakClaims=await asUser("select public.claim_achievements($1,array['cash_discipline','hot_streak']) as earned",[learningRun.id]);
assert.deepEqual(streakClaims.earned,['cash_discipline','hot_streak']);
for (const kind of ['research','compare','risk','plan','wait']) {
  await asUser("insert into public.learning_entries(user_id,session_id,game_day,kind,decision,evidence) values($1,$2,1,$3,'wait','I compared the evidence, preserved cash for bills, and will investigate before taking a position.')",[user,learningRun.id,kind]);
  await asUser("insert into public.user_daily_goal_completions(user_id,session_id,game_day,goal_id) values($1,$2,1,$3)",[user,learningRun.id,`learn_${kind}`]);
}
assert.equal(Number((await scalar('select count(*) from public.trades where session_id=$1',[learningRun.id])).count),0);
await rejected("insert into public.learning_entries(user_id,session_id,game_day,kind,decision,evidence) values($1,$2,1,'wait','consider','I want a position but mislabeled it as a wait note.')",[user,learningRun.id]);
await rejected("insert into public.learning_entries(user_id,session_id,game_day,kind,decision,evidence) values($1,$2,1,'risk','wait','Too short')",[user,learningRun.id]);
await db.query("update public.game_sessions set current_day=6,market_phase='after_hours' where id=$1",[learningRun.id]);
await quote(learningRun.id,6);await quote(learningRun.id,7);
const bill=await asUser("select public.advance_game_day($1,7,'infinite') as result",[learningRun.id]);
assert.equal(Number(bill.result.amount_paid),100);
let totals=(await db.query('select * from public.get_account_breakdown($1)',[learningRun.id])).rows;
assert.equal(Number(totals.find(f=>f.kind==='living_cost').amount),-100);
assert.equal(Number((await scalar('select cash_balance from public.game_sessions where id=$1',[learningRun.id])).cash_balance),1900);
await db.query("update public.game_sessions set cash_balance=30,current_day=13,market_phase='after_hours' where id=$1",[learningRun.id]);
await quote(learningRun.id,13);await quote(learningRun.id,14);
const partialBill=await asUser("select public.advance_game_day($1,14,'infinite') as result",[learningRun.id]);
assert.equal(Number(partialBill.result.amount_paid),30);
assert.equal(Number((await scalar("select sum(amount) as amount from public.account_flows where session_id=$1 and kind='living_cost'",[learningRun.id])).amount),-130);
// Learning reflections must point to journals in the same owned run.
const journalRow=await scalar('select id from public.trade_journal_entries where session_id=$1 limit 1',[again.id]);
await rejected("insert into public.learning_entries(user_id,session_id,game_day,kind,journal_id,decision,evidence,reflection) values($1,$2,14,'reflection',$3,'keep','I checked the new evidence against my original exit plan.','Position size was small but the gain could have been luck.')",[user,learningRun.id,journalRow.id]);
const other='aaaaaaaa-0000-0000-0000-000000000002';
await db.query('insert into auth.users(id,email) values($1,$2)',[other,'other@example.test']);
await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
assert.equal(Number((await asUser('select count(*) from public.learning_entries where session_id=$1',[learningRun.id])).count),0);
assert.equal(Number((await asUser('select count(*) from public.get_account_breakdown($1)',[learningRun.id])).count),0);
console.log('Beginner learning checks passed: no-trade goals, note validation, spending, partial bills, restored notes and rewards, and cross-account access.');
const roundingRun=await asUser("select * from public.start_new_game_with_mode('infinite')");
await db.query('update public.game_sessions set cash_balance=333.2 where id=$1',[roundingRun.id]);
await quote(roundingRun.id,1,37.19);
const roundedFill=await asUser("select public.execute_trade_checked($1,'CAI','buy',1,8,gen_random_uuid()) as result",[roundingRun.id]);
assert.equal(Number(roundedFill.result.execution_price),41.65);
assert.equal(Number(roundedFill.result.cash),0,'The Max quote and checked fill must agree at the exact cash boundary');
console.log('Rounded quote and database fill agree at the exact affordability boundary.');
await db.close();
