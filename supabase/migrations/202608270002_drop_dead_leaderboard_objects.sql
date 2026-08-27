begin;

-- Remove database objects nothing reads any more.
--
-- 1. leaderboard_entries + record_leaderboard_score
--    Both leaderboards moved onto game_sessions in 202607240003 /
--    202607310001: get_leaderboard reads the newest infinite session's
--    net_worth, and get_30_day_leaderboard reads limited_30 sessions sitting on
--    day 30. Nothing has read leaderboard_entries since. record_leaderboard_score
--    kept writing to it on every trade and every day advance -- a write per
--    sync, feeding a table with no readers.
--
--    !! This DROPs a table that holds rows. Nothing displays them and nothing
--    has since 202607240003, but the delete is irreversible. To keep a copy,
--    run this first, outside the migration:
--        create table public.leaderboard_entries_backup as
--          select * from public.leaderboard_entries;
--
-- 2. start_new_game()
--    Superseded by start_new_game_with_mode(text) in 202607080001. The no-arg
--    version has had no caller since.
--
-- Deliberately NOT dropped: set_updated_at() and handle_new_user(). They look
-- unreferenced because no application code names them, but they back five
-- updated_at triggers and the auth.users -> profiles signup trigger.

drop function if exists public.record_leaderboard_score(numeric, text, integer);
drop table    if exists public.leaderboard_entries;
drop function if exists public.start_new_game();

commit;
