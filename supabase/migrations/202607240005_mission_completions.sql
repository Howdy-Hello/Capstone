begin;

-- ── Beginner mission completions ────────────────────────────────────────
-- A one-time onboarding checklist (not daily-rotating, unlike daily goals)
-- guiding new players through the core loop. Mirrors user_achievement_unlocks.

create table if not exists public.user_mission_completions (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  mission_id   text        not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

alter table public.user_mission_completions enable row level security;

drop policy if exists "Users own their mission completions" on public.user_mission_completions;
create policy "Users own their mission completions"
  on public.user_mission_completions for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
