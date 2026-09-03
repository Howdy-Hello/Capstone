begin;

-- Lets the debrief query filter on "is this review due yet?" in the database
-- instead of fetching a bounded page and filtering in the client, which could
-- starve short-horizon entries behind older long-horizon ones.
alter table public.trade_journal_entries
  add column if not exists due_day integer
  generated always as (game_day + horizon_days) stored;

create index if not exists trade_journal_pending_review_idx
  on public.trade_journal_entries(session_id, due_day)
  where reviewed_day is null;

-- The client only ever closes a review out. Keep it from rewriting the trade
-- itself, or from re-opening an entry to farm duplicate advisor messages.
drop policy if exists "Users update own trade journal" on public.trade_journal_entries;
create policy "Users update own trade journal"
on public.trade_journal_entries for update to authenticated
using (user_id = auth.uid() and reviewed_day is null)
with check (user_id = auth.uid() and reviewed_day is not null);

create or replace function public.trade_journal_lock_columns()
returns trigger
language plpgsql
as $$
begin
  if new.session_id is distinct from old.session_id
     or new.user_id is distinct from old.user_id
     or new.symbol is distinct from old.symbol
     or new.trade_type is distinct from old.trade_type
     or new.quantity is distinct from old.quantity
     or new.execution_price is distinct from old.execution_price
     or new.game_day is distinct from old.game_day
     or new.thesis is distinct from old.thesis
     or new.horizon_days is distinct from old.horizon_days
     or new.exit_plan is distinct from old.exit_plan
     or new.created_at is distinct from old.created_at then
    raise exception 'Only reviewed_day may be updated on a trade journal entry';
  end if;
  return new;
end;
$$;

drop trigger if exists trade_journal_lock_columns_trg on public.trade_journal_entries;
create trigger trade_journal_lock_columns_trg
  before update on public.trade_journal_entries
  for each row execute function public.trade_journal_lock_columns();

commit;
