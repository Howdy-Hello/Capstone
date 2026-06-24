begin;

-- ── Save Slots ───────────────────────────────────────────────────────────────
-- Snapshot-based cloud saves. Holdings are stored as JSONB so they can be
-- restored without touching game_sessions directly.

create table if not exists public.save_slots (
  id                uuid          primary key default gen_random_uuid(),
  user_id           uuid          not null references auth.users(id) on delete cascade,
  slot_name         text          not null default 'Save',
  game_day          integer       not null check (game_day between 1 and 30),
  cash_balance      numeric(14,2) not null,
  net_worth         numeric(14,2) not null,
  holdings_snapshot jsonb         not null default '[]',
  created_at        timestamptz   not null default now()
);

create index if not exists save_slots_user_idx
  on public.save_slots(user_id, created_at desc);

alter table public.save_slots enable row level security;

create policy "Users own their save slots"
  on public.save_slots for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Achievement Unlocks ──────────────────────────────────────────────────────

create table if not exists public.user_achievement_unlocks (
  user_id        uuid        not null references auth.users(id) on delete cascade,
  achievement_id text        not null,
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.user_achievement_unlocks enable row level security;

create policy "Users own their achievement unlocks"
  on public.user_achievement_unlocks for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Leaderboard function ─────────────────────────────────────────────────────
-- SECURITY DEFINER so it can aggregate game_sessions across all users even
-- when RLS on that table restricts row-level access.

create or replace function public.get_leaderboard(p_limit integer default 50)
returns table (
  user_id        uuid,
  best_net_worth numeric,
  return_pct     numeric,
  username       text,
  display_name   text,
  avatar_url     text
)
language sql
security definer
set search_path = ''
as $$
  select
    gs.user_id,
    max(gs.net_worth)                                        as best_net_worth,
    round((max(gs.net_worth) - 2000.0) / 2000.0 * 100, 2)  as return_pct,
    p.username,
    p.display_name,
    p.avatar_url
  from  public.game_sessions gs
  join  public.profiles p on p.id = gs.user_id
  group by gs.user_id, p.username, p.display_name, p.avatar_url
  order by best_net_worth desc
  limit p_limit;
$$;

revoke all   on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to authenticated, anon;

-- ── Restore save slot helper ─────────────────────────────────────────────────
-- Applies a snapshot back onto the caller's active session.

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

  -- load the slot (RLS already ensures ownership via auth.uid())
  select * into slot_row
  from   public.save_slots
  where  id = p_slot_id and user_id = auth.uid();

  if not found then
    raise exception 'Save slot not found';
  end if;

  -- find or create active session
  select * into session_row
  from   public.game_sessions
  where  user_id = auth.uid() and status = 'active'
  order  by updated_at desc
  limit  1
  for update;

  if not found then
    raise exception 'No active game session';
  end if;

  -- restore cash + day
  update public.game_sessions
  set    cash_balance   = slot_row.cash_balance,
         current_day    = slot_row.game_day,
         net_worth      = slot_row.net_worth,
         portfolio_value = slot_row.net_worth - slot_row.cash_balance,
         updated_at     = now()
  where  id = session_row.id;

  -- wipe current holdings
  delete from public.holdings where session_id = session_row.id;

  -- restore holdings from snapshot
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

revoke all   on function public.restore_save_slot(uuid) from public;
grant execute on function public.restore_save_slot(uuid) to authenticated;

commit;
