begin;

-- New runs use the forward-simulated opening; existing runs and saves keep their engine.
alter table public.game_sessions drop constraint if exists game_sessions_market_engine_check;
alter table public.game_sessions add constraint game_sessions_market_engine_check check (market_engine in (1, 2, 3));
alter table public.game_sessions alter column market_engine set default 3;
alter table public.save_slots drop constraint if exists save_slots_market_engine_check;
alter table public.save_slots add constraint save_slots_market_engine_check check (market_engine in (1, 2, 3));
alter table public.save_slots alter column market_engine set default 3;

alter table public.session_stock_prices drop constraint if exists session_stock_prices_game_day_check;
alter table public.session_stock_prices add constraint session_stock_prices_game_day_check check (game_day >= -14);
alter table public.session_market_news drop constraint if exists session_market_news_game_day_check;
alter table public.session_market_news add constraint session_market_news_game_day_check check (game_day >= -14);

create or replace function public.market_fingerprint_for(p_mode text, p_seed text, p_engine smallint)
returns text language sql immutable set search_path = '' as $$
  select coalesce(p_mode, 'infinite') || ':' || coalesce(p_seed, '')
    || case when p_engine >= 3 then ':v3' when p_engine >= 2 then ':v2' else '' end;
$$;

commit;
