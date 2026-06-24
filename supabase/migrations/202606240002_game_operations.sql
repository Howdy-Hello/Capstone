begin;

create or replace function public.execute_trade(
  target_session_id uuid,
  target_symbol text,
  target_trade_type text,
  target_price numeric,
  target_game_day integer,
  target_quantity integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_row public.game_sessions%rowtype;
  stock_row public.stocks%rowtype;
  holding_row public.holdings%rowtype;
  next_cash numeric(14, 2);
  next_quantity integer;
  next_average numeric(12, 2);
  trade_total numeric(14, 2);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target_trade_type not in ('buy', 'sell') then
    raise exception 'Trade type must be buy or sell';
  end if;

  if target_price <= 0 or target_quantity <= 0 then
    raise exception 'Price and quantity must be positive';
  end if;

  if target_game_day not between 1 and 30 then
    raise exception 'Game day must be between 1 and 30';
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
  into stock_row
  from public.stocks
  where symbol = upper(target_symbol)
    and is_active = true;

  if not found then
    raise exception 'Stock not found';
  end if;

  trade_total := round(target_price * target_quantity, 2);

  select *
  into holding_row
  from public.holdings
  where session_id = target_session_id
    and stock_id = stock_row.id
  for update;

  if target_trade_type = 'buy' then
    if session_row.cash_balance < trade_total then
      raise exception 'Not enough cash';
    end if;

    next_cash := session_row.cash_balance - trade_total;
    next_quantity := coalesce(holding_row.quantity, 0) + target_quantity;
    next_average := round(
      (
        coalesce(holding_row.average_purchase_price * holding_row.quantity, 0)
        + trade_total
      ) / next_quantity,
      2
    );

    insert into public.holdings (
      session_id,
      stock_id,
      quantity,
      average_purchase_price
    )
    values (
      target_session_id,
      stock_row.id,
      next_quantity,
      next_average
    )
    on conflict (session_id, stock_id) do update
    set
      quantity = excluded.quantity,
      average_purchase_price = excluded.average_purchase_price,
      updated_at = now();
  else
    if holding_row.id is null or holding_row.quantity < target_quantity then
      raise exception 'Not enough shares';
    end if;

    next_cash := session_row.cash_balance + trade_total;
    next_quantity := holding_row.quantity - target_quantity;
    next_average := holding_row.average_purchase_price;

    if next_quantity = 0 then
      delete from public.holdings where id = holding_row.id;
    else
      update public.holdings
      set quantity = next_quantity, updated_at = now()
      where id = holding_row.id;
    end if;
  end if;

  update public.game_sessions
  set
    cash_balance = next_cash,
    current_day = target_game_day,
    updated_at = now()
  where id = target_session_id;

  insert into public.trades (
    session_id,
    user_id,
    stock_id,
    game_day,
    trade_type,
    quantity,
    price_per_share
  )
  values (
    target_session_id,
    auth.uid(),
    stock_row.id,
    target_game_day,
    target_trade_type,
    target_quantity,
    target_price
  );

  return jsonb_build_object(
    'cash', next_cash,
    'symbol', stock_row.symbol,
    'quantity', next_quantity,
    'average_purchase_price', next_average
  );
end;
$$;

create or replace function public.start_new_game()
returns public.game_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_session public.game_sessions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.game_sessions
  set status = 'paused', updated_at = now()
  where user_id = auth.uid()
    and status = 'active';

  insert into public.game_sessions (
    user_id,
    status,
    current_day,
    starting_cash,
    cash_balance,
    portfolio_value,
    net_worth
  )
  values (
    auth.uid(),
    'active',
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

revoke all on function public.execute_trade(uuid, text, text, numeric, integer, integer)
from public;
grant execute on function public.execute_trade(uuid, text, text, numeric, integer, integer)
to authenticated;

revoke all on function public.start_new_game()
from public;
grant execute on function public.start_new_game()
to authenticated;

commit;
