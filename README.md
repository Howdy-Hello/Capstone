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
```

**server/.env**
```
PORT=5000
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
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
- [ ] Deploy client (Vercel / Netlify)
- [ ] Deploy server (Railway / Render)
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
