-- From the 2026-10-08 bug hunt.
--
-- BUG-001 (still open after 202610060001): players could still DELETE their
-- own profile row, then insert it again with just their id.
-- last_level_reward_processed fell back to its default of 1, so
-- process_level_cash_rewards paid every level again -- unlimited cash. Players
-- can no longer delete profiles; account deletion goes through the API
-- server (auth.admin.deleteUser), which cascades with the service role.
--
-- BUG-033: restore_save_slot (202610060003) set portfolio_value to
-- net_worth - cash. net_worth now subtracts unpaid_bills, so a slot saved with
-- more debt than holdings gave a negative value, which violated
-- check (portfolio_value >= 0), and the slot could never be loaded.
--
-- Apply after 202610060003.

begin;

-- ── 1. profiles: no player deletes ──────────────────────────────────────────

drop policy if exists "Users can delete own profile" on public.profiles;
revoke delete on public.profiles from anon, authenticated;

-- ── 2. restore_save_slot: holdings value can't go negative ──────────────────
-- Same as 202610060003 except portfolio_value.
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
  seen_day    integer;
  keeps_rank  boolean;
  regenerate  boolean;
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

  select max_day into seen_day
  from public.market_seed_progress
  where user_id = auth.uid()
    and game_mode = slot_row.game_mode
    and game_seed = slot_row.game_seed;

  -- The player has already seen this market past the slot's day (202610060002).
  keeps_rank := slot_row.ranked and slot_row.game_day >= coalesce(seen_day, 0);

  -- Stored market rows belong to one mode + seed + engine. Same fingerprint:
  -- they are exactly what the generator would produce again, and rows past
  -- the restored day stay hidden by RLS. Otherwise the server regenerates --
  -- from the secret seed, so a legacy plain seed is never reused (BUG-006).
  regenerate := session_row.market_fingerprint is distinct from
    public.market_fingerprint_for(slot_row.game_mode, slot_row.game_seed, slot_row.market_engine);
  if regenerate then
    delete from public.session_stock_prices where session_id = session_row.id;
    delete from public.session_market_news where session_id = session_row.id;
    update public.game_sessions
    set market_generated_through = 0,
        market_fingerprint = null,
        market_seed_secret = true
    where id = session_row.id;
  end if;

  update public.game_sessions
  set    cash_balance    = slot_row.cash_balance,
         unpaid_bills    = slot_row.unpaid_bills,
         current_day     = slot_row.game_day,
         game_mode       = slot_row.game_mode,
         game_seed       = slot_row.game_seed,
         market_engine   = slot_row.market_engine,
         ranked          = keeps_rank,
         net_worth       = slot_row.net_worth,
         -- net_worth = cash + holdings - debt, floored at 0, so add the debt
         -- back; recompute_session_value below sets the exact value.
         portfolio_value = greatest(0, slot_row.net_worth - slot_row.cash_balance + slot_row.unpaid_bills),
         -- Rebase the bill clock onto the restored day (202608270001).
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

  perform public.recompute_session_value(session_row.id);

  select * into session_row from public.game_sessions where id = session_row.id;
  return session_row;
end;
$$;

revoke all on function public.restore_save_slot(uuid) from public, anon;
grant execute on function public.restore_save_slot(uuid) to authenticated;

commit;
