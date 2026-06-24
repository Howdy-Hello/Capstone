begin;

drop policy if exists "Public can read stocks" on public.stocks;
create policy "Public can read stocks"
on public.stocks for select to anon
using (true);

drop policy if exists "Public can read stock prices" on public.stock_prices;
create policy "Public can read stock prices"
on public.stock_prices for select to anon
using (true);

drop policy if exists "Public can read market events" on public.market_events;
create policy "Public can read market events"
on public.market_events for select to anon
using (true);

drop policy if exists "Public can read event impacts" on public.event_stock_impacts;
create policy "Public can read event impacts"
on public.event_stock_impacts for select to anon
using (true);

commit;
