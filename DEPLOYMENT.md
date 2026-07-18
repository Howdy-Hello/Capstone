# Deploying StockPilot

Three pieces: **Supabase** (database/auth), the **client** (React), and the
optional **API server** (Express). The client works on its own; the server adds
the persistent leaderboard + game-sync routes.

---

## 1. Supabase (do this first)

Apply all migrations to your project:

```bash
# with the Supabase CLI
supabase link --project-ref <your-ref>
supabase db push
```

…or open **Supabase → SQL Editor** and run each file in `supabase/migrations/`
in filename order (they're timestamp-ordered). The newest,
`202607190001_persistent_leaderboard.sql`, creates the leaderboard table.

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
| `REACT_APP_API_URL` | your deployed API URL (see §3); omit to run client-only |

### Vercel
1. New Project → import the repo.
2. **Root Directory: `client`** (this picks up `client/vercel.json`).
3. Add the env vars above → Deploy. The config sets the build command,
   output dir, SPA rewrites, and `CI=false`.

### Netlify
1. Add new site → import the repo. `netlify.toml` (repo root) sets base=`client`,
   the build command, publish dir, `CI=false`, and the SPA redirect.
2. Add the env vars above → Deploy.

> The repo's default `npm run build` script moves output into `../docs` for
> GitHub Pages. The Vercel/Netlify configs override that to publish the CRA
> `build/` directory directly, so all three deploy targets coexist.

---

## 3. API server — Render or Railway

Required env vars:

| Var | Value |
| --- | --- |
| `SUPABASE_URL` | your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (server-only secret) |
| `SUPABASE_ANON_KEY` | anon key (so user-scoped routes run under RLS) |
| `CLIENT_ORIGIN` | your deployed client origin, e.g. `https://your-app.vercel.app` |
| `ADMIN_API_SECRET` | optional; guards `/api/admin/*` |

### Render
Blueprint deploy — `render.yaml` (repo root) sets rootDir=`server`, build, start,
and the env var slots. New → Blueprint → pick the repo → fill in the env values.

### Railway
New Project → Deploy from repo → set **Root Directory: `server`**. Railway builds
via `npm run build` and starts via the `Procfile` (`web: npm start`). Add the env
vars above.

---

## 4. Wire them together
- Set the client's `REACT_APP_API_URL` to the server URL and redeploy the client.
- Set the server's `CLIENT_ORIGIN` to the client URL (CORS allowlist).
- Verify: `GET https://<api>/api/leaderboard` returns JSON; the leaderboard page
  loads and updates after a trade.

If the server is down or unset, the client automatically falls back to calling
Supabase directly — nothing breaks, you just lose the server-side write path.
