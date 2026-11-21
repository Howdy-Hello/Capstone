begin;

-- Keep legacy completion history; new completions use Toronto calendar dates.
alter table public.user_daily_goal_completions
  add column goal_date date,
  add column completion_id bigint generated always as identity;
alter table public.user_daily_goal_completions
  alter column goal_date set default ((now() at time zone 'America/Toronto')::date),
  drop constraint user_daily_goal_completions_pkey,
  add primary key (completion_id),
  add unique (user_id, session_id, goal_date, goal_id);

drop policy if exists "Users own their daily goal completions" on public.user_daily_goal_completions;
create policy "Users own their daily goal completions"
  on public.user_daily_goal_completions for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and goal_date = (now() at time zone 'America/Toronto')::date
    and exists (
      select 1 from public.game_sessions gs
      where gs.id = session_id and gs.user_id = auth.uid()
        and gs.status = 'active' and gs.current_day = game_day
        and (
          (goal_id = 'watch2' and (select count(*) from public.user_watchlist w where w.user_id = auth.uid()) >= 2)
          or (goal_id = 'hold2' and (select count(*) from public.holdings h where h.session_id = gs.id and h.quantity > 0) >= 2)
          or (goal_id = 'cash20' and gs.net_worth > 0 and gs.cash_balance >= gs.net_worth * 0.20)
          or (goal_id in ('buy1', 'sell1') and exists (
            select 1 from public.trades t
            where t.session_id = gs.id
              and t.trade_type = case when goal_id = 'buy1' then 'buy' else 'sell' end
              and (t.executed_at at time zone 'America/Toronto')::date = goal_date
          ))
        )
    )
  );

commit;
