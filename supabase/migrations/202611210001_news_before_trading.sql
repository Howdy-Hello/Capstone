-- Publish today's articles before players trade. Future articles and prices
-- remain hidden; closing still blocks trades and advancing reopens the market.
drop policy if exists "Players read own run news" on public.session_market_news;
create policy "Players read own run news"
on public.session_market_news for select to authenticated
using (
  exists (
    select 1 from public.game_sessions s
    where s.id = session_market_news.session_id
      and s.user_id = (select auth.uid())
      and session_market_news.game_day <= s.current_day
  )
);
