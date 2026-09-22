# StockPilot — Full-Stack Template

A full-stack web application boilerplate built with **React + TypeScript** (frontend) and **Express + TypeScript** (backend), using **Supabase** for auth, database, and storage.

---

## Tech Stack

| Layer     | Technology                              |
|-----------|------------------------------------------|
| Frontend  | React 19, TypeScript, MUI v6, Recharts  |
| Backend   | Node.js, Express, TypeScript             |
| Database  | Supabase (PostgreSQL)                   |
| Auth      | Supabase Auth (email/password)          |
| Storage   | Supabase Storage (avatars bucket)       |
| Design    | APEX TERMINAL dark design system        |

---

## Prerequisites

- Node.js 18+
- npm
- Supabase project (free tier works)

---

## Setup

### 1. Clone the repo
```bash
git clone <repository-url>
cd <repository-name>
```

### 2. Install dependencies
```bash
# Client
cd client && npm install

# Server
cd ../server && npm install
```

### 3. Environment variables

**client/.env**
```
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
REACT_APP_API_URL=http://localhost:5000
```

**server/.env**
```
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-or-publishable-key
ADMIN_API_SECRET=replace-with-a-long-random-secret
```

### 4. Supabase setup

Run in the Supabase SQL editor:
```sql
-- Profiles table (linked to auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  username text unique,
  bio text,
  avatar_url text,
  updated_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can upsert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can delete own profile" on public.profiles for delete using (auth.uid() = id);

-- Storage bucket for avatars
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
```

---

## Run the Application

### Start the server
```bash
cd server
npm run dev
```
API available at `http://localhost:5000`

### Start the client
```bash
cd client
npm start
```
App available at `http://localhost:3000`

---

## Deploy on Vercel

Use two Vercel projects connected to this repository and keep the existing
Supabase project. The existing frontend project is `capstone`, with production
URL `https://capstone-gamma-navy.vercel.app`.

| Setting | Frontend | Backend |
| --- | --- | --- |
| Root Directory | `client` | `server` |
| Framework | Create React App | Express |
| Build Command | `react-scripts build` | `npm run build` |
| Output Directory | `build` | Framework default |

Each folder's `vercel.json` supplies the framework and build settings. Vercel
detects `server/src/server.ts` and supports its existing `app.listen` entry point.
The frontend build intentionally skips the GitHub Pages copy into `docs/`.

1. Import the repository again for a backend project named `stockpilot-api`,
   selecting `server` as the Root Directory. Set its Production environment:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
   - `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`)
   - `CLIENT_ORIGIN=https://capstone-gamma-navy.vercel.app`
   - `ADMIN_API_SECRET`: a separate secret if using admin routes.
2. Deploy the backend and check `https://<backend-domain>/api/health`.
   Use the actual domain assigned by Vercel, not an assumed project-name domain.
3. Set the frontend project's Production environment:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_PUBLISHABLE_KEY`
   - `REACT_APP_API_URL=https://<backend-domain>` (no trailing slash or `/api`).
   Redeploy the frontend: React embeds these values at build time.
4. In Supabase Authentication URL Configuration, set the Site URL to the
   frontend production URL and allow these redirect URLs:
   - `https://capstone-gamma-navy.vercel.app/auth/callback`
   - `https://capstone-gamma-navy.vercel.app/update-password`
5. Verify direct navigation to `/auth`, sign-in, leaderboard, game sync, and
   password-reset redirects. Test account deletion only with a disposable user.

Keep Supabase secret/service-role keys in the backend project only. The API must
be reachable by browser users; Vercel deployment protection can block calls to
protected preview URLs before Express receives them. Use the production domain
for `REACT_APP_API_URL`. For previews, explicitly configure their allowed origins
and Supabase redirect URLs rather than allowing every `*.vercel.app` origin.

The in-memory API rate limiter is per function instance on Vercel and resets
on cold starts; it is not a deployment-wide quota. Auth and validation remain
enforced on every request.

References: [Express on Vercel](https://vercel.com/docs/frameworks/backend/express)
and [Create React App on Vercel](https://vercel.com/docs/frameworks/frontend/create-react-app).

---

## Project Structure

```
.
├── client/
│   └── src/
│       ├── components/        # Header, Footer, StockCard, etc.
│       ├── context/           # AuthContext (Supabase session)
│       ├── data/              # Mock stocks, trading state
│       ├── lib/               # supabase.ts client
│       ├── pages/             # All route pages
│       ├── theme/             # design.ts (APEX TERMINAL tokens)
│       ├── types/             # Shared TypeScript types
│       └── utils/             # stockEngine, helpers
└── server/
    └── src/
        ├── controllers/       # Route handlers
        ├── db/                # Supabase client (server-side)
        ├── models/            # Type definitions (no ORM)
        ├── routes/            # Express routers
        └── server.ts          # App entry point
```

---

## Progress Checklist

### Current Status
- [x] Supabase cloud saves, leaderboard, achievements, daily goals, beginner missions, and stock alerts are implemented.
- [x] Express validation and API/account rate limiting are implemented.
- [x] Client/server deployment config files are present.
- [x] CI build/test workflow is present.
- [ ] Email confirmation still must be enabled in the Supabase dashboard.
- [ ] Live client and server deployment URLs still need to be confirmed.
- [ ] User levels, in-game email, and expanded stock alert history remain future work.

### ✅ Done
- [x] React + TypeScript client scaffolded
- [x] MUI v6 integrated
- [x] Express + TypeScript server scaffolded
- [x] Supabase client set up (client-side)
- [x] Supabase Auth — email/password sign up, login, password reset
- [x] Supabase `profiles` table with RLS
- [x] Avatar upload/change/delete via Supabase Storage
- [x] Profile CRUD page (display name, username, bio, danger zone)
- [x] AuthContext with session persistence
- [x] Protected routes (auth-gated pages)
- [x] Header with user dropdown + mobile drawer
- [x] Footer with nav links
- [x] APEX TERMINAL dark design system (`design.ts`)
- [x] Home page (hero, features, how it works, CTA)
- [x] Dashboard (stats, holdings, pie chart, bar chart, news)
- [x] Game page (buy/sell, story mode, day progression)
- [x] Stock Details page (area chart, fundamentals, related news)
- [x] News page (news cards, tone chips, sidebar tips)
- [x] Learn page (Tutorial tab + Market Guide tab)
- [x] Leaderboard page (ranked table, top 3, your rank)
- [x] Achievements page (6 achievements, progress bars)
- [x] Save/Load page (localStorage slots, save/load/clear)
- [x] Server → replaced MongoDB/Mongoose with Supabase

### 🔲 TODO
- [ ] Google OAuth (Supabase social login)
- [ ] Real leaderboard — persist net worth to Supabase `leaderboard` table
- [ ] Real achievements — track and persist unlock state to Supabase
- [ ] Real save/load — persist save slots to Supabase instead of localStorage only
- [ ] Server-side API routes wired to Supabase (game state, leaderboard writes)
- [ ] Input validation middleware on Express routes
- [ ] Rate limiting on auth endpoints
- [ ] Email confirmation flow (currently disabled)
- [ ] Verify current client deployment (Vercel)
- [ ] Deploy server (Vercel)
- [ ] CI/CD pipeline

---

## Design System

All UI tokens live in `client/src/theme/design.ts` (APEX TERMINAL):

```ts
D.bg          // #09090F  — page background
D.surface     // #0E101A  — card / header background
D.brand       // #7C3AED  — violet primary
D.green       // #22C55E  — gains
D.red         // #EF4444  — losses
D.t1          // #F1F5F9  — primary text
```

---

## Notes

- The game (stocks, news, trading) uses **mock data only** — no real market data.
- Auth is handled entirely client-side via Supabase. The Express server is available for future server-side features (game persistence, leaderboard, etc.).
- Starting cash: **$2,000** · Season length: **30 days** · Story intro: **3 days**
