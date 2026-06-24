# StockPilot Server

Express + TypeScript backend with Supabase server-side auth helpers.

## Environment

Create `server/.env` with:

```env
PORT=5000
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key
SUPABASE_JWKS_URL=https://your-project-ref.supabase.co/auth/v1/.well-known/jwks.json
```

Never commit `SUPABASE_SECRET_KEY`.

## Commands

```bash
npm install
npm run dev
npm run build
```

## Supabase Server Routes

The Express app mounts Supabase SDK routes under `/api`:

- `GET /api/health` uses `auth: "none"`
- `GET /api/me` uses `auth: "user"` and requires `Authorization: Bearer <user-jwt>`
- `DELETE /api/account` uses `auth: "user"` and permanently deletes the authenticated user
- `GET /api/admin/profile-count` uses `auth: "secret"` and requires `apikey: <SUPABASE_SECRET_KEY>`

Route handlers use the local Express adapter in `src/lib/supabaseServer.ts`, which wraps `withSupabase` from `@supabase/server` and exposes `ctx.supabase` and `ctx.supabaseAdmin`.
