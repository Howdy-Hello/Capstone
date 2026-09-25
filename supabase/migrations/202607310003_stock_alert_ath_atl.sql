begin;

-- ── All-time high/low stock alerts ──────────────────────────────────────
-- Extends user_stock_alerts to support "new all-time high" / "new all-time
-- low" conditions alongside the existing price/percent-change conditions.

alter table public.user_stock_alerts
  drop constraint if exists user_stock_alerts_condition_check;

alter table public.user_stock_alerts
  add constraint user_stock_alerts_condition_check
  check (condition in (
    'price_above', 'price_below', 'pct_change_up', 'pct_change_down',
    'new_all_time_high', 'new_all_time_low'
  ));

commit;
