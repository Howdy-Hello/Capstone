begin;

-- Rank individual completed 30-day attempts. Unlike the overall leaderboard,
-- repeat runs remain visible so players can compare their best finishes.
create or replace function public.get_30_day_leaderboard(p_limit integer default 50)
returns table (
  run_id uuid,
  user_id uuid,
  best_net_worth numeric,
  return_pct numeric,
  completed_at timestamptz,
  username text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    gs.id as run_id,
    gs.user_id,
    gs.net_worth as best_net_worth,
    round((gs.net_worth - gs.starting_cash) / nullif(gs.starting_cash, 0) * 100, 2) as return_pct,
    gs.updated_at as completed_at,
    p.username,
    p.display_name,
    p.avatar_url
  from public.game_sessions gs
  join public.profiles p on p.id = gs.user_id
  where gs.game_mode = 'limited_30'
    and gs.current_day = 30
  order by gs.net_worth desc, gs.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.get_30_day_leaderboard(integer) from public;
grant execute on function public.get_30_day_leaderboard(integer) to authenticated;

commit;
