# Gameplay audit fixes — 2026-10-06

> **Superseded (2026-10-08):** The migration this file asks you to apply was never applied and was removed. It depended on objects that only exist in Howdy-Hello's unapplied design. Its gameplay pieces were rebuilt on the live schema in `supabase/migrations/202610080005_reconcile_gameplay.sql`; see `FIXES_APPLIED_2026-10-08.md`.

The 24 numbered findings and the requested text cuts have code changes. The separate balance/performance questions retain their existing rules.

## Behavior

- **B01–B03:** Trusted API quotes use the same market engine as the browser. Database operations calculate fills, portfolio value, and net worth from persisted state. Direct competitive-state writes are revoked; achievement inserts require database-observed thresholds. Day 1 restores use the database day. Old tabs cannot rewind a run; conflicting local actions are blocked.
- **B04:** Removed mission/daily-goal XP promises and completion messages. Achievement XP remains the single level/reward source, as permitted by the audit's proposed fix.
- **B05–B09, B12:** Advisor ownership, phase, billing clock, holdings, trades, journal, and daily-goal completions are included in atomic snapshots. Restore creates a separate session timeline. Hiring atomically debits $100 and grants Riley once. Final challenge results are immutable and deduplicated by run lineage. A reward receipt ledger reconciles post-snapshot level cash on restore without a second payout.
- **B10–B11, B18:** Account deletion clears only that user's and their sessions' local keys. Daily-goal and advisor identities include the run.
- **B13–B17:** Overlapping news impacts sum. Completion uses unrounded thresholds. Goals/missions show failed persistence and retry controls. Failed trades retain input and show a specific safe error. Shared in-flight protection and database operation IDs prevent duplicate trade submissions/retries.
- **B19–B24:** Header unread counts include the same revealed news as Inbox. Bills stop at the challenge boundary. Profile fetch errors offer retry. Light custom themes use dark text. Trade reviews use Advisor. Removed the unsupported cloud-health claim.
- Removed the save strategy/storage duplication, provider name, rival seed explanations, hardcoded footer version, and persistent gameplay tips. News definitions are expandable; gameplay pages have a compact footer. The rival chart still identifies the comparison with current player wealth.

## Release requirements and compatibility

Deploy the API and client together with `supabase/migrations/202610080003_gameplay_integrity.sql`. The gameplay API is now required: set `REACT_APP_API_URL` to the running API. There is deliberately no client-write fallback. Build the server from a full repository checkout; `scripts/sync-market-engine.cjs` copies the canonical pure market modules from `client/src/data` before build/dev/test.

Historical state cannot be certified retroactively. Existing sessions and legacy saves remain playable as practice runs; new runs qualify for leaderboards and new achievement unlocks. Existing account achievements are retained. Previously completed scores are not imported into the verified results table. Old snapshots cannot reconstruct purchases, phase, histories, or reward claims they never recorded; new snapshots capture all of these. Riley ownership still present in the original browser is imported when that legacy practice run is opened, so it can then follow the run across devices and into new saves.

Do not rename already-deployed migration versions blindly. The audit's duplicate historical versions still require comparison with the deployed migration history before a fresh CLI deployment. No live database changes or deployment were performed here.

## Verification

- Client unit/regression tests, including Day 1 cache restore, stale quote objects, rapid clicks, connection errors, overlapping impacts, and custom light palettes.
- Client/server TypeScript checks and server tests.
- Disposable PostgreSQL migration and behavioral checks: `node server/scripts/test-gameplay-db.mjs /path/to/@electric-sql/pglite/dist/index.js`. The optional test engine is not an application dependency.
- The database checks cover permissions, exact achievement thresholds, duplicate operations, stale days, atomic advisor debits, history/phase/advisor restoration, run-scoped goals, repeated reward reconciliation, and immutable challenge results.

Authenticated live browser flows and production migrations still require deployment validation. Split-order pricing, partial bill forgiveness, rival rules, and long-run performance are unchanged balance/deployment concerns from the audit.
