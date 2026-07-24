begin;

-- Aggregate achievement popularity without exposing another user's unlocks.
create or replace function public.get_achievement_unlock_rates()
returns table (
  achievement_id text,
  unlock_count bigint,
  total_players bigint,
  unlock_percentage numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with player_total as (
    select count(*)::bigint as total_players
    from public.profiles
  )
  select
    unlocks.achievement_id,
    count(*)::bigint as unlock_count,
    player_total.total_players,
    case
      when player_total.total_players = 0 then 0::numeric
      else round(
        count(*)::numeric / player_total.total_players::numeric * 100,
        1
      )
    end as unlock_percentage
  from public.user_achievement_unlocks unlocks
  cross join player_total
  group by unlocks.achievement_id, player_total.total_players
  order by unlocks.achievement_id;
$$;

revoke all on function public.get_achievement_unlock_rates() from public;
grant execute on function public.get_achievement_unlock_rates() to authenticated;

commit;
