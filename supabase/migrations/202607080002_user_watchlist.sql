begin;

create table if not exists public.user_watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  stock_id bigint not null references public.stocks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, stock_id)
);

create index if not exists user_watchlist_user_idx
  on public.user_watchlist(user_id, created_at desc);

alter table public.user_watchlist enable row level security;

drop policy if exists "Users read own watchlist" on public.user_watchlist;
create policy "Users read own watchlist"
on public.user_watchlist for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own watchlist" on public.user_watchlist;
create policy "Users insert own watchlist"
on public.user_watchlist for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own watchlist" on public.user_watchlist;
create policy "Users delete own watchlist"
on public.user_watchlist for delete to authenticated
using ((select auth.uid()) = user_id);

commit;
