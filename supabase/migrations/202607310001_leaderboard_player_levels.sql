begin;

create or replace function public.player_total_xp(target_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(
    case unlocks.achievement_id
      when 'first_trade' then 100
      when 'risk_taker' then 300
      when 'active_trader' then 450
      when 'diversified' then 500
      when 'sector_scout' then 400
      when 'watchlist_builder' then 150
      when 'cash_builder' then 250
      when 'market_regular' then 125
      when 'closing_bell' then 600
      when 'smart_investor' then 250
      when 'cash_discipline' then 350
      when 'hot_streak' then 500
      when 'market_master' then 750
      else 0
    end
  ), 0)::bigint
  from public.user_achievement_unlocks unlocks
  where unlocks.user_id = target_user_id;
$$;

drop function if exists public.get_leaderboard(integer);

create function public.get_leaderboard(p_limit integer default 50)
returns table (
  user_id uuid,
  best_net_worth numeric,
  return_pct numeric,
  username text,
  display_name text,
  avatar_url text,
  total_xp bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with current_infinite_run as (
    select distinct on (gs.user_id)
      gs.user_id,
      gs.net_worth,
      gs.starting_cash
    from public.game_sessions gs
    where gs.game_mode = 'infinite'
    order by gs.user_id, gs.started_at desc, gs.id desc
  )
  select
    run.user_id,
    run.net_worth,
    round((run.net_worth - run.starting_cash) / nullif(run.starting_cash, 0) * 100, 2),
    p.username,
    p.display_name,
    p.avatar_url,
    public.player_total_xp(run.user_id)
  from current_infinite_run run
  join public.profiles p on p.id = run.user_id
  order by run.net_worth desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

drop function if exists public.get_30_day_leaderboard(integer);

create function public.get_30_day_leaderboard(p_limit integer default 50)
returns table (
  run_id uuid,
  user_id uuid,
  best_net_worth numeric,
  return_pct numeric,
  completed_at timestamptz,
  username text,
  display_name text,
  avatar_url text,
  total_xp bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    gs.id,
    gs.user_id,
    gs.net_worth,
    round((gs.net_worth - gs.starting_cash) / nullif(gs.starting_cash, 0) * 100, 2),
    gs.updated_at,
    p.username,
    p.display_name,
    p.avatar_url,
    public.player_total_xp(gs.user_id)
  from public.game_sessions gs
  join public.profiles p on p.id = gs.user_id
  where gs.game_mode = 'limited_30'
    and gs.current_day = 30
  order by gs.net_worth desc, gs.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.player_total_xp(uuid) from public;
revoke all on function public.get_leaderboard(integer) from public;
revoke all on function public.get_30_day_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to authenticated;
grant execute on function public.get_30_day_leaderboard(integer) to authenticated;

commit;
