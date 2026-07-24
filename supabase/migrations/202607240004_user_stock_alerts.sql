begin;

-- ── Stock price alerts ──────────────────────────────────────────────────
-- Lets a player set a price/percent-change threshold on a symbol and get a
-- toast notification when it's crossed. Alerts are one-shot: once triggered
-- they're marked inactive (active=false, triggered_at set) rather than
-- deleted, so a player can see their alert history if we surface it later.

create table if not exists public.user_stock_alerts (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  symbol       text        not null,
  condition    text        not null check (condition in ('price_above', 'price_below', 'pct_change_up', 'pct_change_down')),
  threshold    numeric(14,4) not null check (threshold >= 0),
  active       boolean     not null default true,
  created_at   timestamptz not null default now(),
  triggered_at timestamptz
);

create index if not exists user_stock_alerts_user_active_idx
  on public.user_stock_alerts(user_id, active, created_at desc);

alter table public.user_stock_alerts enable row level security;

create policy "Users own their stock alerts"
  on public.user_stock_alerts for all to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
