// lib/supabase.ts throws at import time without these, and CI's test step has
// no .env (BUG-067). Placeholders only: suites that talk to Supabase mock
// lib/supabase, and the rest never make a request.
if (!process.env.REACT_APP_SUPABASE_URL) {
  process.env.REACT_APP_SUPABASE_URL = "http://localhost:54321";
}
if (!process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY) {
  process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
}
