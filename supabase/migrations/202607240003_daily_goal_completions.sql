begin;

-- ── Daily goal completions ──────────────────────────────────────────────
-- useDailyGoals.ts previously persisted completions to localStorage only,
-- so progress didn't follow the player across devices/browsers. This table
-- mirrors user_achievement_unlocks: a per-user, per-(day,goal) completion
-- marker written by the client once a goal's progress hits 100%.

create table if not exists public.user_daily_goal_completions (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  game_day     integer     not null check (game_day >= 1),
  goal_id      text        not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, game_day, goal_id)
);

create index if not exists user_daily_goal_completions_user_idx
  on public.user_daily_goal_completions(user_id, game_day desc);

alter table public.user_daily_goal_completions enable row level security;

create policy "Users own their daily goal completions"
  on public.user_daily_goal_completions for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
