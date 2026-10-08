import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables.");
}

if (!/^https?:\/\//.test(supabaseUrl)) {
  throw new Error(
    "REACT_APP_SUPABASE_URL must be a full URL, for example https://your-project-ref.supabase.co."
  );
}

// "Remember me" decides WHERE the session is stored, which is what actually
// controls whether it survives closing the browser:
//   on  -> localStorage,   persists until sign-out (supabase-js default)
//   off -> sessionStorage, dies with the tab
//
// The preference itself always lives in localStorage, because on the next page
// load we have to know which store to read the session back out of before any
// session exists.
const REMEMBER_KEY = "stockpilot-remember-me";

function safeLocal(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    // Private mode / blocked site data throws on access, not just on write.
    return null;
  }
}

function safeSession(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function isRememberMeEnabled() {
  // Default on, matching supabase-js's own default and the usual expectation
  // that a checked box is the normal case.
  return safeLocal()?.getItem(REMEMBER_KEY) !== "0";
}

/**
 * Must be called BEFORE signInWithPassword/signInWithOAuth: the auth client
 * writes the new session through the adapter below immediately, so the flag has
 * to already point at the intended store.
 */
export function setRememberMe(remember: boolean) {
  try {
    safeLocal()?.setItem(REMEMBER_KEY, remember ? "1" : "0");
  } catch {
    /* storage unavailable -- fall back to the in-memory default */
  }
}

function activeStore(): Storage | null {
  return isRememberMeEnabled() ? safeLocal() : safeSession();
}

const rememberAwareStorage = {
  getItem: (key: string) => {
    try {
      return activeStore()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      activeStore()?.setItem(key, value);
    } catch {
      /* quota or blocked storage: the session stays in memory for this tab */
    }
  },
  removeItem: (key: string) => {
    // Clear both, never just the active one: toggling the preference between a
    // write and a sign-out would otherwise strand a live session in the store
    // we are no longer looking at.
    try { safeLocal()?.removeItem(key); } catch { /* ignore */ }
    try { safeSession()?.removeItem(key); } catch { /* ignore */ }
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { storage: rememberAwareStorage },
});

/**
 * True when PostgREST reports that a table or RPC doesn't exist. Some newer
 * features (close_market, hire_advisor, learning_entries) ship ahead of their
 * migrations, so callers fall back to the older client-side behaviour.
 */
export function isMissingDbObject(error: unknown) {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  return code === "PGRST202" || code === "PGRST205" || code === "42883" || code === "42P01"
    || /could not find the (function|table)|schema cache/i.test(message ?? "");
}
