begin;

-- Infinite rankings represent each player's latest infinite-run state, not the
-- highest value they have ever reached in any mode.
create or replace function public.get_leaderboard(p_limit integer default 50)
returns table (
  user_id uuid,
  best_net_worth numeric,
  return_pct numeric,
  username text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest_infinite_run as (
    select distinct on (gs.user_id)
      gs.user_id,
      gs.net_worth,
      gs.starting_cash
    from public.game_sessions gs
    where gs.game_mode = 'infinite'
    order by gs.user_id, gs.updated_at desc
  )
  select
    run.user_id,
    run.net_worth as best_net_worth,
    round(
      (run.net_worth - run.starting_cash)
      / nullif(run.starting_cash, 0)
      * 100,
      2
    ) as return_pct,
    p.username,
    p.display_name,
    p.avatar_url
  from latest_infinite_run run
  join public.profiles p on p.id = run.user_id
  order by run.net_worth desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to authenticated;

commit;
