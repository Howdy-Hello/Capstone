begin;

-- Restoring a save left the weekly-bill clock untouched.
--
-- restore_save_slot rewinds current_day (and cash, mode, seed, holdings) but
-- never touched game_sessions.bills_paid_through_day. advance_game_day bills
-- `floor(next_day / 7) - floor(bills_paid_through_day / 7)` cycles at $350
-- each, so the next day advance after a restore settled every week between the
-- stale clock and the restored day in one lump:
--
--   * Load a day-90 save into a session whose clock sat at 0 and the next
--     advance charges floor(90/7) = 12 cycles = $4,200 against the cash the
--     slot just restored -- money the original run had already paid.
--   * In the other direction, loading an early save into a far-along session
--     left the clock ahead of the restored day, so every replayed week was
--     rent-free until play passed the old high-water mark.
--
-- The slot's cash_balance already reflects the bills the original run paid up
-- to slot.game_day, so the correct clock for a restored session is the last
-- completed cycle at or before that day. save_slots does not record the
-- original clock, and this is exactly what advance_game_day itself stores
-- (next_paid_through = floor(next_day / 7) * 7), so the two agree.
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
         -- Rebase the bill clock onto the restored day (see header).
         bills_paid_through_day = greatest(0, floor(slot_row.game_day / 7.0)::integer * 7),
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
