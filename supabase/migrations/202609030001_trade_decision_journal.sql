begin;

create table if not exists public.trade_journal_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  trade_type text not null check (trade_type in ('buy', 'sell')),
  quantity integer not null check (quantity > 0),
  execution_price numeric(12, 2) not null check (execution_price > 0),
  game_day integer not null check (game_day >= 1),
  thesis text not null default '' check (char_length(thesis) <= 500),
  horizon_days integer not null default 3 check (horizon_days between 1 and 365),
  exit_plan text not null default '' check (char_length(exit_plan) <= 500),
  reviewed_day integer check (reviewed_day is null or reviewed_day >= game_day),
  created_at timestamptz not null default now()
);

create index if not exists trade_journal_session_day_idx
  on public.trade_journal_entries(session_id, game_day desc, created_at desc);

alter table public.trade_journal_entries enable row level security;

drop policy if exists "Users read own trade journal" on public.trade_journal_entries;
create policy "Users read own trade journal"
on public.trade_journal_entries for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users insert own trade journal" on public.trade_journal_entries;
create policy "Users insert own trade journal"
on public.trade_journal_entries for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.game_sessions
    where game_sessions.id = trade_journal_entries.session_id
      and game_sessions.user_id = auth.uid()
  )
);

drop policy if exists "Users update own trade journal" on public.trade_journal_entries;
create policy "Users update own trade journal"
on public.trade_journal_entries for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users delete own trade journal" on public.trade_journal_entries;
create policy "Users delete own trade journal"
on public.trade_journal_entries for delete to authenticated
using (user_id = auth.uid());

commit;
