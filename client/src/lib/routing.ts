export type AuthMode = "login" | "signup" | "reset";

export function resolveAuthMode(requestedMode: string | null): AuthMode {
  return requestedMode === "signup" || requestedMode === "reset" ? requestedMode : "login";
}

// V4-06: a logged-out player who opens a shared link to a protected page logs
// in and lands on that page. Only paths on this site are kept, so `next` can't
// send anyone to another site ("//host", "/\host" and full URLs are refused).
const AFTER_LOGIN = "/dashboard";
const POST_LOGIN_KEY = "stockpilot-post-login-path";

export function safeNextPath(raw: string | null | undefined, origin?: string): string {
  // eslint-disable-next-line no-control-regex
  if (!raw || raw.length > 512 || !raw.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(raw)) return AFTER_LOGIN;
  const site = origin ?? window.location.origin;
  let url: URL;
  try {
    url = new URL(raw, site);
  } catch {
    return AFTER_LOGIN;
  }
  if (url.origin !== site || url.pathname.startsWith("//")) return AFTER_LOGIN;
  if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) return AFTER_LOGIN;
  return url.pathname + url.search + url.hash;
}

/** The login address for a protected page, carrying the page to return to. */
export function loginPathFor(pathname: string, search = ""): string {
  const next = safeNextPath(pathname + search);
  return next === AFTER_LOGIN ? "/auth?mode=login" : `/auth?mode=login&next=${encodeURIComponent(next)}`;
}

// Google sign-in leaves the site and comes back to /auth/callback. The page to
// return to waits in this tab's sessionStorage, so the callback address that
// Supabase allows stays exactly as it is.
export function rememberPostLoginPath(path: string) {
  try {
    if (path === AFTER_LOGIN) sessionStorage.removeItem(POST_LOGIN_KEY);
    else sessionStorage.setItem(POST_LOGIN_KEY, path);
  } catch {
    // Storage blocked (private mode): the player lands on the dashboard.
  }
}

export function takePostLoginPath(): string {
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(POST_LOGIN_KEY);
    sessionStorage.removeItem(POST_LOGIN_KEY);
  } catch {
    // Storage blocked: fall back to the dashboard.
  }
  return safeNextPath(stored);
}

type SymbolRecord = { symbol: string };

export function resolveComparisonSymbols(
  stocks: SymbolRecord[],
  watchlist: SymbolRecord[],
  requestedLeft: string | null,
  requestedRight: string | null,
) {
  const symbols = new Set(stocks.map((stock) => stock.symbol));
  const left = requestedLeft && symbols.has(requestedLeft)
    ? requestedLeft
    : watchlist.find((stock) => symbols.has(stock.symbol))?.symbol ?? stocks[0]?.symbol ?? "";
  const right = requestedRight && symbols.has(requestedRight) && requestedRight !== left
    ? requestedRight
    : watchlist.find((stock) => symbols.has(stock.symbol) && stock.symbol !== left)?.symbol
      ?? stocks.find((stock) => stock.symbol !== left)?.symbol
      ?? stocks[0]?.symbol
      ?? "";
  return { left, right };
}
