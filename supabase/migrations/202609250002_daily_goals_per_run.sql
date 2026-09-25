-- Daily goal completions were keyed by (user, game_day, goal) only, so a new
-- run showed the previous run's goals for the same day number as already done.
-- Completions now belong to a run. Existing rows can't be attributed to one,
-- and goals only affect the goal widget (not XP or cash), so they are cleared.
begin;

delete from public.user_daily_goal_completions;

alter table public.user_daily_goal_completions
  add column if not exists session_id uuid not null
    references public.game_sessions(id) on delete cascade;

alter table public.user_daily_goal_completions
  drop constraint if exists user_daily_goal_completions_pkey;

alter table public.user_daily_goal_completions
  add primary key (user_id, session_id, game_day, goal_id);

drop index if exists public.user_daily_goal_completions_user_idx;
create index if not exists user_daily_goal_completions_session_idx
  on public.user_daily_goal_completions(session_id, game_day);

commit;
