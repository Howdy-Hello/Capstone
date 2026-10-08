# Deploying StockPilot

Three pieces: **Supabase** (database/auth), the **client** (React), and the
**API server** (Express). All three are required: the server generates and
stores each run's market and is the only thing that can advance a run's day,
so the game can't be played without it.

For the existing live installation (confirmed 2026-10-08), SQL b and c have
not been applied. Herdy must run these updated files in the SQL editor:

1. `supabase/run_all_2026-10-08b.sql` (202610080002).
2. `supabase/run_all_2026-10-08c.sql` (202610080005).
3. Deploy the API server from the same commit, with the required environment
   variables below, then redeploy the client from that commit.

The live client identified in BUG-043 is an older build that calls missing
RPCs. Its trading fix requires the complete SQL b → SQL c → API → client
sequence. Compatibility fallbacks support earlier schemas during rollout;
the market close, checked trade retries and reward rules require SQL c.

**Deploy order matters** when upgrading an existing install: apply the
migrations, deploy the server (with its server-only Supabase credential), then deploy the
client with `REACT_APP_API_URL`. An old client stops working as soon as the
`202609250001` migration is applied, because it wrote session state directly.

---

## 1. Supabase (do this first)

Apply all migrations to your project:

```bash
# with the Supabase CLI
supabase link --project-ref <your-ref>
supabase db push
```

…or open **Supabase → SQL Editor** and run each file in `supabase/migrations/`
in filename order (they're timestamp-ordered). Make sure the `20260724...`
migrations are included; they add daily goals, stock alerts, and beginner
mission completion tables.

### Record SQL-editor applications before using the CLI

The updated b/c one-shot files record their migration versions automatically
when `supabase_migrations.schema_migrations` exists. Their transaction bodies
match the corresponding migrations; history recording and read-only checks
follow the commit. Do not rerun b after c in a completed deployment: b
replaces functions that c upgrades.

The already-run `run_all_2026-10-08.sql` did not record history. Run
`supabase/record_manual_migrations_2026-10-08.sql` by hand once to record the
34 migrations already confirmed live through 202610080001. It changes only
migration history and is safe to rerun. If an older copy of b/c was applied
without recording history, insert versions `202610080002` /
`bug_hunt_integrity_fixes` and `202610080005` / `reconcile_gameplay` by hand,
with `on conflict do nothing`, before a later `supabase db push`.

### Enable email confirmation (optional)
**Supabase → Authentication → Providers → Email → "Confirm email" = ON.**
Then add your deployed client URL under **Authentication → URL Configuration →
Redirect URLs** (e.g. `https://your-app.vercel.app/**`). The client already
handles the "check your email" state and offers a resend button.

---

## 2. Client — Vercel or Netlify

Required env vars (from **Supabase → Project Settings → API**):

| Var | Value |
| --- | --- |
| `REACT_APP_SUPABASE_URL` | your project URL |
| `REACT_APP_SUPABASE_PUBLISHABLE_KEY` | anon/publishable key |
| `REACT_APP_API_URL` | your deployed API URL (see §3); required |

### Vercel
1. New Project → import the repo.
2. **Root Directory: `client`** (this picks up `client/vercel.json`).
3. Add the env vars above → Deploy. The config sets the build command,
   output dir, SPA rewrites, and `CI=false`.

### Netlify
1. Add new site → import the repo. `netlify.toml` (repo root) sets base=`client`,
   the build command, publish dir, `CI=false`, and the SPA redirect.
2. Add the env vars above → Deploy.

> GitHub Pages is no longer used: `npm run build` writes the CRA `build/`
> directory, which Vercel and Netlify publish.

---

## 3. API server — Vercel, Render or Railway

Required env vars:

| Var | Value |
| --- | --- |
| `SUPABASE_URL` | your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (server-only secret) |
| `SUPABASE_ANON_KEY` | anon key (so user-scoped routes run under RLS) |
| `CLIENT_ORIGIN` | your deployed client origin, e.g. `https://your-app.vercel.app` |
| `MARKET_SEED_SECRET` | Required in production: a stable, server-only secret of 16+ characters. Keep the value unchanged for active runs. Missing or short values block market generation and make `/api/health/config` return 503. Development/tests retain the dev-only fallback. |
| `ADMIN_API_SECRET` | optional; guards `/api/admin/*` |

`SUPABASE_SECRET_KEY` may replace `SUPABASE_SERVICE_ROLE_KEY`, and
`SUPABASE_PUBLISHABLE_KEY` may replace `SUPABASE_ANON_KEY`. A user-scoped key
is required; its absence makes `/api/health/config` return 503 because account
routes and game sync cannot work without it. Detailed configuration messages
require the matching `x-admin-secret` header.

### Vercel
New Project → import the repo → **Root Directory: `server`** (picks up
`server/vercel.json`, Express preset). Add the env vars above. `server.ts`
exports the app for Vercel and only binds a port when not on Vercel.

### Render
Blueprint deploy — `render.yaml` (repo root) sets rootDir=`server`, build, start,
and the env var slots. New → Blueprint → pick the repo → fill in the env values.

### Railway
Recommended setup:
1. New Project -> Deploy from repo.
2. Leave **Root Directory** empty or `/`.
3. Set **Config File Path** to `/railway.json`.
4. Add the env vars above.

This repo's root `railway.json` runs `cd server && npm ci && npm run build`,
then starts with `cd server && npm start`. This avoids Railway/Railpack looking
for a nested `/server` directory after it has already unpacked a subdirectory.

Alternate setup:
If you set **Root Directory** to `/server`, set **Config File Path** to
`/server/railway.json` and do not override the build/start commands in the
dashboard.

---

## 4. Wire them together
- Set the client's `REACT_APP_API_URL` to the server URL and redeploy the client.
- Set the server's `CLIENT_ORIGIN` to the client URL (CORS allowlist; a trailing slash is fine).
- Verify: `GET https://<api>/api/health` returns JSON.
- Verify: `GET https://<api>/api/health/config` returns `status: "ok"` (a 503 means a required variable is missing).
- Verify: open the game, advance a day and make a trade; the leaderboard updates.

If the server is down the game shows an error instead of playing: prices,
day advances and trades are all validated server-side now.

## 5. Shared market engine
The server runs the same market generator as the client. The source lives in
`client/src/data/{mockStocks,infiniteMarket,sessionMarket}.ts`; after editing
any of them run `node scripts/sync-market-engine.cjs` to refresh the copies in
`server/src/market/`. `npm test` in `server/` fails if they are out of date.

## Market-key stability and October 7 repairs

> **Superseded (2026-10-08):** `202610070002_market_restore_and_progress.sql` was never applied and was removed. It depended on objects that only exist in Howdy-Hello's unapplied design. Its gameplay pieces were rebuilt on the live schema in `supabase/migrations/202610080005_reconcile_gameplay.sql`; see `FIXES_APPLIED_2026-10-08.md`.

The SQL below is no longer applied. Originally it preserved a restored run's market engine and
observed prices, tracks the furthest played day, fixes achievement streak claims,
and keeps prepared future quotes hidden. New infinite runs use distinct seeds.

Do not change an existing `MARKET_SEED_SECRET`. This server now requires it in
production and never derives a market key from a Supabase credential at runtime.
If the previous production server used the credential fallback, preserve its
market before deploying this version: freeze the previously derived key into
`MARKET_SEED_SECRET` using the exact credential that old server selected. The derivation is
HMAC-SHA256 of `stockpilot:market-seed:v1`, keyed by `SUPABASE_SECRET_KEY` if set,
otherwise `SUPABASE_SERVICE_ROLE_KEY`, encoded as lowercase hex. Keep that value
server-only. Generate it locally without printing credentials or the result to
shared logs, and save the result in the API environment. A new random secret
would change active runs' future prices. Once preserved, Supabase credentials
can rotate independently of the market secret.

A server-only deployment can build from the committed market modules. Full
checkouts refresh all shared market modules during build/test; missing modules
fail the build instead of shipping a broken generator.
