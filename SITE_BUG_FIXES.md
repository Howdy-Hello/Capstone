# Site bug fixes — October 7, 2026

Reviewed and repaired the current Capstone checkout. The older project mirror does not contain the market endpoint that produced the reported error.

## Fixed

- **“Market generation is not configured.”** Production can derive a stable, private market key from the existing server-only Supabase credential when the separate market secret is unset. Explicit market secrets keep their existing behavior; invalid explicit secrets still fail. Public credentials never generate production markets.
- **Backend deployment builds fail without the client folder.** Server-only builds use the committed market modules; full checkouts refresh all four shared modules and check their consistency.
- **Stale day, phase, and cash during reload.** The context reads fresh session state after market preparation instead of applying the earlier session snapshot.
- **No recovery after a failed game load.** Market and Portfolio now offer Retry, which reloads stock metadata, market rows, holdings, watchlist, and session state and clears successful-load errors.
- **A committed advance can show yesterday's cash after a later read fails.** The committed day, cash, and bill are retained immediately. Missing current-day prices are not replaced by old quotes or listing prices.
- **Save/load exceptions escape or leave controls stuck.** Network exceptions now show recoverable errors and release the pending state.
- **Every new infinite run uses the same seed.** New infinite runs receive their own seed; existing markets are retained.
- **Restored saves lose their market settings/history and ranking rules.** Restores preserve the engine and secret-seed mode, copy observed market prices/news/quotes, and make rewinds practice-only. Learning notes, journal associations, spending, and reward reconciliation remain intact.
- **Achievement claims use obsolete streak counters and account-wide trade counts.** Claims share the current, run-scoped eligibility rules used by the checked game state.
- **Completed save restores duplicate challenge leaderboard entries.** The challenge board uses immutable, deduplicated results.
- **Prepared future trade quotes can be read before an advance commits.** Quote access is limited to the current day; the API also refuses advances before the market closes.
- **Fresh migrations fail on a duplicate daily-goal column.** The existing column addition is now conditional; migration versions are unchanged.
- **The Max quote disagrees with the checked fill at a cash boundary.** Quotes round each share to cents before totaling, matching the database execution price.

## Validation

- 93 client tests across 17 suites; client TypeScript check and production build.
- Server tests and production build, including a separate server-only build without a sibling client folder.
- All SQL migrations and gameplay regressions on disposable PostgreSQL: permissions, future-quote visibility, exact affordability, separate seeds, restored market settings/history, rewind ranking, streak claims, deduplicated challenge results, learning notes, bills, advisor spending, and reward reconciliation.

## Release boundary

These are source fixes. Production has not been deployed or migrated. Apply `supabase/migrations/202610070002_market_restore_and_progress.sql` after the learning migration, then deploy the API and client. Keep the market key stable; `DEPLOYMENT.md` documents credential rotation when using the derived production key.

Authenticated browser testing was blocked because the browser's admin-enforced security policy could not be verified. The automated and disposable-database checks do not establish live production behavior.
