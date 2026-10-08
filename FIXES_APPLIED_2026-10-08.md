# Fixes applied 2026-10-08 (StockPilot bug hunt)

Status of the bug hunt `stockpilot-2026-10-08`. The original `report.md` lives
in `qa-evidence/stockpilot-2026-10-08/` on the OMEN machine; this table is
meant to be copied into it as its "Fixes applied" section.

SQL is applied by hand in the Supabase SQL editor, in this order:

1. `supabase/run_all_2026-10-08b.sql` (202610080002), if not run yet.
2. `supabase/run_all_2026-10-08c.sql` (202610080005).

Then push, deploy the API server, then the client (Vercel).

| ID | Status | Where / notes |
|---|---|---|
| BUG-001 | Fixed | `708ca31`, 202610080001: players can't delete their own profile to reset the level-reward cursor |
| BUG-002 | Fixed | 202610060002: a restore that rewinds past a day already seen on that market loses its rank (`market_seed_progress`) |
| BUG-003 | Fixed | 202610060001: achievement unlocks no longer writable by their owner (`claim_achievements`) |
| BUG-004 / 034 | Fixed | `c8a7012`, 202610080002: engine-1 endless runs inside the script are unranked |
| BUG-005 | Fixed | 202610060002: runs and slots written before the server-authoritative market are unranked |
| BUG-006 | Fixed | 202610060003: restore regenerates from the secret seed |
| BUG-007 | Fixed | 202610060003: per-player 30-day board, daily run cap |
| BUG-008 | Fixed | `708ca31`, 202610060003: unpaid bills carry over as debt |
| BUG-009 | Fixed | server: `MAX_ADVANCE_DAYS = 1` (verified), run day capped by `clampRunDay` (`MAX_RUN_DAY` 10,000), new per-user limit of 30 advances/min (`marketRoutes.ts`) |
| BUG-013 | Fixed, needs Herdy | `/privacy` page + footer links. **Needs a contact email**: set `PRIVACY_CONTACT` in `client/src/pages/Privacy.tsx` |
| BUG-014 | Fixed | 202610080005: trades and advances refuse a run whose market fingerprint doesn't match |
| BUG-015 | Fixed | `c8a7012`: `create_save_slot` takes a per-player lock (kept in 080005) |
| BUG-016 | Fixed | 202610080005 + client quote: slippage on the day's cumulative quantity per stock and side |
| BUG-017 | Fixed | `c8a7012`; tightened in 080005 (today's day of the active run, learning evidence required) |
| BUG-018 | Fixed | `c8a7012`: avatar URL allow-list |
| BUG-019 | Fixed | `/api/health/config` detail only with a matching `ADMIN_API_SECRET`, never while unset; constant-time compare |
| BUG-020 | Fixed | user-scoped Supabase client never falls back to the service-role key. **The API server now needs `SUPABASE_ANON_KEY`** |
| BUG-021 | Fixed | `c8a7012`: `trade_journal_lock_columns()` search_path |
| BUG-022 | Fixed | `docs/` removed, `npm run build` no longer copies there (GitHub Pages not used) |
| BUG-024 | Fixed | client quote: totals rounded to cents, missing price valued at cost basis, same net-worth basis as `execute_trade` |
| BUG-025 | Fixed | 202610080005: average cost stored with 6 decimals |
| BUG-026 | Fixed | auth and update-password inputs 16px; search inputs 16px on phones |
| BUG-027 | Fixed | sign-up / log-in errors shown under the field they belong to |
| BUG-029 | Fixed | one h1 and a per-route `document.title` on every page (`usePageTitle`) |
| BUG-030 | Fixed | `sitemap.xml`, `Sitemap:` in robots.txt, 1200x630 `og-image.png`, Open Graph / Twitter tags |
| BUG-031 | Fixed | 404 route adds `noindex`, title and h1 |
| BUG-032 | Needs Herdy | Vercel still serves the Oct 5 build: check the project's Git connection and redeploy |
| BUG-033 | Fixed | `708ca31`: restore works for saves with more debt than holdings |
| BUG-035 | Fixed (decided) | 202610080005: level **cash** only in ranked endless runs; XP still counts from every run |
| BUG-036 | Fixed | `c8a7012`: restore resets streaks |
| BUG-037 | Fixed | `c8a7012`: endless board filters ranked after picking the newest run |
| BUG-038 | Fixed | `3d21bb9`: session loaded with `select("*")` |
| BUG-039 | Fixed | `c8a7012`: run cap counts `started_mode` |
| BUG-040 | Fixed | `708ca31`: CRLF-safe sync script |
| BUG-041 | Fixed | logo link has `aria-label="StockPilot home"` |
| BUG-042 | Fixed | footer links are at least 24px tall |
| BUG-010, 011, 012, 023, 028 | Not checked here | Not in the handover's open list and `report.md` isn't on this machine; check against the report |

## Merge reconciliation (Howdy-Hello's 080003/080004)

Neither migration could run on the live schema (080003 fails on its first
`alter`), and the merged client/server already called objects only they
created, so loading a game, trading, advancing and saving all failed on the
live database. 202610080005 rebuilds the parts that fit the
server-authoritative design on top of the live functions; 080003/080004 are
deleted (git history keeps them).

Decisions taken (Herdy, 2026-10-08): the market must be closed before
advancing and trading is refused after hours; level cash ranked-only with XP
from every run; 080003/080004 deleted; `docs/` removed.
Decisions taken by default, following the live design: restore stays in place
(no branching into a new session); "verified run" is `ranked`; Riley is a $100
server-side purchase; a living-cost flow records the bill charged (paid or
added to debt).

Not ported: `session_quotes`, `refresh_session_value`, player-callable
`advance_game_day`, `trusted_state` / `lineage_id` / `cash_streak` /
`gain_streak`, `challenge_results`, `level_reward_receipts`,
`achievement_eligible`, the branching restore, their versions of
`start_new_game_with_mode` and both leaderboards, `import_legacy_advisor`.

## Verification

- SQL: every migration applied to a disposable PostgreSQL (PGlite with
  Supabase stubs; Docker isn't installed on this PC), plus 21 behaviour checks:
  `node server/scripts/test-gameplay-db.mjs <path to @electric-sql/pglite>`.
  `run_all_2026-10-08c.sql` was applied twice on top of the live state; all
  11 of its checks returned true.
- Client: `npx tsc --noEmit`, jest suite. Server: `npx tsc --noEmit`, `npm test`.
- Not verified: a real Supabase project (PGlite stubs `auth` and `storage`),
  and the app in a browser (no `.env` on this PC).
