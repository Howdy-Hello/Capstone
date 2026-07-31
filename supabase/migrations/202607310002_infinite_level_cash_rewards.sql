begin;

alter table public.profiles
  add column if not exists last_level_reward_processed integer not null default 1
    check (last_level_reward_processed >= 1);

create or replace function public.player_level_from_xp(target_xp bigint)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  remaining_xp bigint := greatest(0, coalesce(target_xp, 0));
  current_level integer := 1;
  previous_requirement bigint := 100;
  current_requirement bigint := 100;
  next_requirement bigint;
begin
  while remaining_xp >= current_requirement loop
    remaining_xp := remaining_xp - current_requirement;
    current_level := current_level + 1;

    if current_level = 2 then
      previous_requirement := 100;
      current_requirement := 150;
    else
      next_requirement := previous_requirement + current_requirement;
      previous_requirement := current_requirement;
      current_requirement := next_requirement;
    end if;
  end loop;

  return current_level;
end;
$$;

-- Existing players start at their current level, avoiding retroactive payouts
-- for levels earned before cash rewards existed.
update public.profiles profile
set last_level_reward_processed = public.player_level_from_xp(
  public.player_total_xp(profile.id)
);

create or replace function public.process_level_cash_rewards(
  target_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.game_sessions%rowtype;
  profile_row public.profiles%rowtype;
  current_level integer;
  reward_level integer;
  reward_for_level numeric(14, 2);
  total_reward numeric(14, 2) := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into session_row
  from public.game_sessions
  where id = target_session_id
    and user_id = auth.uid()
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active game session not found';
  end if;

  select *
  into profile_row
  from public.profiles
  where id = auth.uid()
  for update;

  current_level := public.player_level_from_xp(
    public.player_total_xp(auth.uid())
  );

  if current_level <= profile_row.last_level_reward_processed then
    return jsonb_build_object(
      'level', current_level,
      'cash_reward', 0,
      'game_mode', session_row.game_mode
    );
  end if;

  -- A challenge level-up is consumed without payment so it cannot be claimed
  -- later by switching modes.
  if session_row.game_mode = 'infinite' then
    for reward_level in
      (profile_row.last_level_reward_processed + 1)..current_level
    loop
      reward_for_level := case reward_level
        when 2 then 50
        when 3 then 75
        when 4 then 100
        when 5 then 150
        else least(300, 150 + (reward_level - 5) * 25)
          + case when reward_level % 5 = 0 then 200 else 0 end
      end;
      total_reward := total_reward + reward_for_level;
    end loop;

    update public.game_sessions
    set cash_balance = cash_balance + total_reward,
        updated_at = now()
    where id = target_session_id;
  end if;

  update public.profiles
  set last_level_reward_processed = current_level,
      updated_at = now()
  where id = auth.uid();

  return jsonb_build_object(
    'level', current_level,
    'cash_reward', total_reward,
    'game_mode', session_row.game_mode
  );
end;
$$;

revoke all on function public.player_level_from_xp(bigint) from public;
revoke all on function public.process_level_cash_rewards(uuid) from public;
grant execute on function public.process_level_cash_rewards(uuid) to authenticated;

commit;
