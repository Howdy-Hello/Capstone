begin;

alter table public.game_sessions
  add column if not exists game_mode text not null default 'infinite';

alter table public.game_sessions
  drop constraint if exists game_sessions_game_mode_check,
  add constraint game_sessions_game_mode_check
    check (game_mode in ('infinite', 'limited_30'));

alter table public.save_slots
  add column if not exists game_mode text not null default 'infinite';

alter table public.save_slots
  drop constraint if exists save_slots_game_mode_check,
  add constraint save_slots_game_mode_check
    check (game_mode in ('infinite', 'limited_30'));

create or replace function public.start_new_game_with_mode(
  target_game_mode text default 'infinite'
)
returns public.game_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_session public.game_sessions%rowtype;
  selected_mode text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  selected_mode := coalesce(nullif(target_game_mode, ''), 'infinite');

  if selected_mode not in ('infinite', 'limited_30') then
    raise exception 'Invalid game mode';
  end if;

  update public.game_sessions
  set status = 'paused', updated_at = now()
  where user_id = auth.uid()
    and status = 'active';

  insert into public.game_sessions (
    user_id,
    status,
    game_mode,
    current_day,
    starting_cash,
    cash_balance,
    portfolio_value,
    net_worth
  )
  values (
    auth.uid(),
    'active',
    selected_mode,
    1,
    2000,
    2000,
    0,
    2000
  )
  returning * into new_session;

  return new_session;
end;
$$;

revoke all on function public.start_new_game_with_mode(text)
from public;
grant execute on function public.start_new_game_with_mode(text)
to authenticated;

create or replace function public.restore_save_slot(
  p_slot_id uuid
)
returns public.game_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  slot_row    public.save_slots%rowtype;
  session_row public.game_sessions%rowtype;
  h           jsonb;
  stock_id_   bigint;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into slot_row
  from   public.save_slots
  where  id = p_slot_id and user_id = auth.uid();

  if not found then
    raise exception 'Save slot not found';
  end if;

  select * into session_row
  from   public.game_sessions
  where  user_id = auth.uid() and status = 'active'
  order  by updated_at desc
  limit  1
  for update;

  if not found then
    raise exception 'No active game session';
  end if;

  update public.game_sessions
  set    cash_balance    = slot_row.cash_balance,
         current_day     = slot_row.game_day,
         game_mode       = slot_row.game_mode,
         net_worth       = slot_row.net_worth,
         portfolio_value = slot_row.net_worth - slot_row.cash_balance,
         updated_at      = now()
  where  id = session_row.id;

  delete from public.holdings where session_id = session_row.id;

  for h in select * from jsonb_array_elements(slot_row.holdings_snapshot)
  loop
    select id into stock_id_ from public.stocks where symbol = (h->>'symbol');
    if found and (h->>'shares')::integer > 0 then
      insert into public.holdings(session_id, stock_id, quantity, average_purchase_price)
      values (
        session_row.id,
        stock_id_,
        (h->>'shares')::integer,
        (h->>'averageCost')::numeric
      );
    end if;
  end loop;

  select * into session_row from public.game_sessions where id = session_row.id;
  return session_row;
end;
$$;

revoke all on function public.restore_save_slot(uuid)
from public;
grant execute on function public.restore_save_slot(uuid)
to authenticated;

commit;
