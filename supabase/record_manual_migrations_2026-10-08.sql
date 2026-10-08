-- StockPilot: record the 34 migrations confirmed already live through 080001.
-- Run by hand after the already-applied run_all_2026-10-08.sql.
-- History only: do not use this on a database missing those migrations.
-- Safe to rerun. Pending 080002/080005 record themselves in SQL b/c.
do $$
begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    insert into supabase_migrations.schema_migrations (version, name)
    values
      ('202606240001', 'stock_simulator_schema'),
      ('202606240002', 'game_operations'),
      ('202606240003', 'news_publishers'),
      ('202606240004', 'complete_market_data'),
      ('202606240005', 'public_market_reads'),
      ('202606240006', 'cloud_saves_achievements_leaderboard'),
      ('202607020001', 'open_ended_gameplay'),
      ('202607020002', 'gas_price_story_arc'),
      ('202607080001', 'game_modes'),
      ('202607080002', 'user_watchlist'),
      ('202607180002', 'game_session_market_seed'),
      ('202607190001', 'persistent_leaderboard'),
      ('202607240001', 'achievement_unlock_rates'),
      ('202607240002', '30_day_run_leaderboard'),
      ('202607240003', 'daily_goal_completions'),
      ('202607240004', 'user_stock_alerts'),
      ('202607240005', 'mission_completions'),
      ('202607240006', 'infinite_current_leaderboard'),
      ('202607300001', 'infinite_live_net_worth'),
      ('202607300002', 'weekly_living_expenses'),
      ('202607310001', 'leaderboard_player_levels'),
      ('202607310002', 'infinite_level_cash_rewards'),
      ('202607310003', 'stock_alert_ath_atl'),
      ('202608270001', 'restore_save_slot_bill_clock'),
      ('202608270002', 'drop_dead_leaderboard_objects'),
      ('202609030001', 'trade_decision_journal'),
      ('202609030002', 'trade_journal_due_day'),
      ('202609180001', 'reduce_weekly_living_expenses'),
      ('202609250001', 'server_authoritative_market'),
      ('202609250002', 'daily_goals_per_run'),
      ('202610060001', 'lock_profile_rewards_and_achievements'),
      ('202610060002', 'ranked_runs_and_seeded_infinite'),
      ('202610060003', 'bill_debt_board_per_player_seed_upgrade'),
      ('202610080001', 'lock_profile_delete_restore_debt')

    on conflict do nothing;
  end if;
end;
$$;
