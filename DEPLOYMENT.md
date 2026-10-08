# Deploying StockPilot

Three pieces: **Supabase** (database/auth), the **client** (React), and the
**API server** (Express). All three are required: the server generates and
stores each run's market and is the only thing that can advance a run's day,
so the game can't be played without it.

**Deploy order matters** when upgrading an existing install: apply the
migrations, deploy the server (with `MARKET_SEED_SECRET`), then deploy the
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
| `MARKET_SEED_SECRET` | random string, 16+ characters. Keys each run's market so players can't compute future prices from the visible seed. **Never change it** once runs exist: already-stored days are safe, but days not yet generated would come out differently. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ADMIN_API_SECRET` | optional; guards `/api/admin/*` |

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
