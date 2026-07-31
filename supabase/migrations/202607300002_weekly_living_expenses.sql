begin;

-- Living expenses are charged once at the end of every seven-day cycle.
-- Keeping the paid-through day on the session makes advancing days idempotent.
alter table public.game_sessions
  add column if not exists bills_paid_through_day integer not null default 0
    check (bills_paid_through_day >= 0);

create or replace function public.advance_game_day(
  target_session_id uuid,
  target_game_day integer,
  target_game_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.game_sessions%rowtype;
  next_day integer;
  due_cycles integer;
  bill_total numeric(14, 2);
  amount_paid numeric(14, 2);
  next_paid_through integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target_game_mode not in ('infinite', 'limited_30') then
    raise exception 'Invalid game mode';
  end if;

  next_day := greatest(1, target_game_day);
  if target_game_mode = 'limited_30' then
    next_day := least(30, next_day);
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

  due_cycles := greatest(
    0,
    floor(next_day / 7.0)::integer
      - floor(session_row.bills_paid_through_day / 7.0)::integer
  );
  bill_total := due_cycles * 350.00;
  amount_paid := least(session_row.cash_balance, bill_total);
  next_paid_through := case
    when due_cycles > 0 then floor(next_day / 7.0)::integer * 7
    else session_row.bills_paid_through_day
  end;

  update public.game_sessions
  set current_day = next_day,
      game_mode = target_game_mode,
      cash_balance = cash_balance - amount_paid,
      bills_paid_through_day = next_paid_through,
      updated_at = now()
  where id = target_session_id;

  return jsonb_build_object(
    'day', next_day,
    'cash', session_row.cash_balance - amount_paid,
    'cycles_charged', due_cycles,
    'bill_total', bill_total,
    'amount_paid', amount_paid,
    'shortfall', bill_total - amount_paid,
    'bills_paid_through_day', next_paid_through
  );
end;
$$;

revoke all on function public.advance_game_day(uuid, integer, text) from public;
grant execute on function public.advance_game_day(uuid, integer, text) to authenticated;

commit;
