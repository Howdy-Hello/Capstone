begin;

-- Infinite mode is a live ranking. A lower current value must replace a
-- player's previous value just as a higher one does.
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

  if p_net_worth is null or p_net_worth <> p_net_worth
     or p_net_worth = 'infinity'::numeric
     or p_net_worth = '-infinity'::numeric then
    raise exception 'Invalid net worth';
  end if;

  clean_nw := round(
    greatest(0::numeric, least(p_net_worth, 1000000000000::numeric)),
    2
  );
  clean_mode := case
    when p_game_mode = 'limited_30' then 'limited_30'
    else 'infinite'
  end;

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
  set best_net_worth = case
        when excluded.game_mode = 'infinite'
          then excluded.best_net_worth
        else greatest(
          public.leaderboard_entries.best_net_worth,
          excluded.best_net_worth
        )
      end,
      best_return_pct = round(
        (
          case
            when excluded.game_mode = 'infinite'
              then excluded.best_net_worth
            else greatest(
              public.leaderboard_entries.best_net_worth,
              excluded.best_net_worth
            )
          end - 2000.0
        ) / 2000.0 * 100,
        2
      ),
      game_mode = excluded.game_mode,
      best_day = excluded.best_day,
      updated_at = now()
  returning * into entry;

  return entry;
end;
$$;

revoke all on function public.record_leaderboard_score(numeric, text, integer)
from public;
grant execute on function public.record_leaderboard_score(numeric, text, integer)
to authenticated;

-- Read the newest infinite run itself instead of an accumulated/high-water
-- score. The session's net_worth is kept current by the game sync endpoint.
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
  from current_infinite_run run
  join public.profiles p on p.id = run.user_id
  order by run.net_worth desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to authenticated;

commit;
