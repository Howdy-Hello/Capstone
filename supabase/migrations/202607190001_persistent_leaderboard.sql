-- Persistent leaderboard.
-- Previously the leaderboard was a live aggregate of game_sessions.net_worth
-- (a client-writable column). This migration adds a dedicated, persistent
-- leaderboard table that stores each user's best net worth, written only via a
-- SECURITY DEFINER function (or the service role) — never by a raw client write.

begin;

-- ── Table ────────────────────────────────────────────────────────────────────

create table if not exists public.leaderboard_entries (
  user_id         uuid          primary key references auth.users(id) on delete cascade,
  best_net_worth  numeric(14,2) not null default 0 check (best_net_worth >= 0),
  best_return_pct numeric(10,2) not null default 0,
  game_mode       text          not null default 'infinite'
                    check (game_mode in ('infinite', 'limited_30')),
  best_day        integer,
  updated_at      timestamptz   not null default now()
);

create index if not exists leaderboard_entries_score_idx
  on public.leaderboard_entries (best_net_worth desc);

alter table public.leaderboard_entries enable row level security;

-- World-readable so anyone can view rankings...
drop policy if exists "Leaderboard is world-readable" on public.leaderboard_entries;
create policy "Leaderboard is world-readable"
  on public.leaderboard_entries for select to authenticated, anon
  using (true);

-- ...but there is intentionally NO insert/update/delete policy. Writes are only
-- possible through record_leaderboard_score() (SECURITY DEFINER) or the service
-- role, so a client cannot PATCH an arbitrary score directly.

-- ── Safe write path ──────────────────────────────────────────────────────────
-- Callable by the authenticated client directly, or by the API server through a
-- user-scoped client. Enforces auth, a monotonic "best only" update, and a
-- sanity cap so garbage/NaN values can't land on the board.

create or replace function public.record_leaderboard_score(
  p_net_worth numeric,
  p_game_mode text default 'infinite',
  p_day       integer default null
)
returns public.leaderboard_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry      public.leaderboard_entries%rowtype;
  clean_nw   numeric(14,2);
  clean_mode text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  -- reject null / NaN / infinity
  if p_net_worth is null or p_net_worth <> p_net_worth
     or p_net_worth = 'infinity'::numeric or p_net_worth = '-infinity'::numeric then
    raise exception 'Invalid net worth';
  end if;

  clean_nw   := round(greatest(0::numeric, least(p_net_worth, 1000000000000::numeric)), 2);
  clean_mode := case when p_game_mode = 'limited_30' then 'limited_30' else 'infinite' end;

  insert into public.leaderboard_entries (
    user_id, best_net_worth, best_return_pct, game_mode, best_day, updated_at
  )
  values (
    auth.uid(),
    clean_nw,
    round((clean_nw - 2000.0) / 2000.0 * 100, 2),
    clean_mode,
    p_day,
    now()
  )
  on conflict (user_id) do update
  set best_net_worth  = greatest(public.leaderboard_entries.best_net_worth, excluded.best_net_worth),
      best_return_pct = round(
        (greatest(public.leaderboard_entries.best_net_worth, excluded.best_net_worth) - 2000.0)
        / 2000.0 * 100, 2),
      game_mode       = excluded.game_mode,
      best_day        = coalesce(excluded.best_day, public.leaderboard_entries.best_day),
      updated_at      = now()
  returning * into entry;

  return entry;
end;
$$;

revoke all   on function public.record_leaderboard_score(numeric, text, integer) from public;
grant execute on function public.record_leaderboard_score(numeric, text, integer) to authenticated;

-- ── Read path ────────────────────────────────────────────────────────────────
-- Same signature as before (so existing callers/types are unchanged), now
-- sourced from the persistent table instead of aggregating game_sessions.

create or replace function public.get_leaderboard(p_limit integer default 50)
returns table (
  user_id        uuid,
  best_net_worth numeric,
  return_pct     numeric,
  username       text,
  display_name   text,
  avatar_url     text
)
language sql
security definer
set search_path = ''
as $$
  select
    le.user_id,
    le.best_net_worth,
    le.best_return_pct as return_pct,
    p.username,
    p.display_name,
    p.avatar_url
  from  public.leaderboard_entries le
  join  public.profiles p on p.id = le.user_id
  order by le.best_net_worth desc
  limit p_limit;
$$;

revoke all   on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to authenticated, anon;

-- ── Backfill ─────────────────────────────────────────────────────────────────
-- Seed the new table from existing sessions so the board isn't empty right after
-- the migration.

insert into public.leaderboard_entries (user_id, best_net_worth, best_return_pct, game_mode, updated_at)
select
  gs.user_id,
  round(max(gs.net_worth), 2),
  round((max(gs.net_worth) - 2000.0) / 2000.0 * 100, 2),
  'infinite',
  now()
from public.game_sessions gs
group by gs.user_id
on conflict (user_id) do update
set best_net_worth  = greatest(public.leaderboard_entries.best_net_worth, excluded.best_net_worth),
    best_return_pct = round(
      (greatest(public.leaderboard_entries.best_net_worth, excluded.best_net_worth) - 2000.0)
      / 2000.0 * 100, 2),
    updated_at      = now();

commit;
