begin;

alter table public.game_sessions
  add column if not exists game_seed text not null default 'STOCKPILOT';

alter table public.game_sessions
  drop constraint if exists game_sessions_game_seed_check,
  add constraint game_sessions_game_seed_check
    check (game_seed ~ '^[A-Z0-9]{1,16}$');

alter table public.save_slots
  add column if not exists game_seed text not null default 'STOCKPILOT';

alter table public.save_slots
  drop constraint if exists save_slots_game_seed_check,
  add constraint save_slots_game_seed_check
    check (game_seed ~ '^[A-Z0-9]{1,16}$');

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
         game_seed       = slot_row.game_seed,
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
