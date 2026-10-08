import assert from "node:assert/strict";
import { rateLimit } from "../middleware/rateLimit";
import { validateBody } from "../middleware/validate";
import { getServerEnvIssues } from "../lib/env";

type MockResponse = {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (body: unknown) => void;
  setHeader: (key: string, value: string) => void;
};

function mockResponse(): MockResponse {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
    },
    setHeader(key: string, value: string) {
      this.headers[key] = value;
    },
  };
  return res;
}

async function testValidateBody() {
  const middleware = validateBody({
    email: { type: "string", required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    quantity: { type: "integer", required: true, min: 1, max: 100 },
  });

  let nextCalled = false;
  const invalidRes = mockResponse();
  middleware(
    { body: { email: "bad", quantity: 0 } } as any,
    invalidRes as any,
    () => { nextCalled = true; }
  );

  assert.equal(nextCalled, false);
  assert.equal(invalidRes.statusCode, 400);
  assert.deepEqual((invalidRes.body as any).message, "Validation failed");

  const validRes = mockResponse();
  middleware(
    { body: { email: "trader@example.com", quantity: 5 } } as any,
    validRes as any,
    () => { nextCalled = true; }
  );

  assert.equal(nextCalled, true);
  assert.equal(validRes.statusCode, 200);
}

async function testRateLimit() {
  const middleware = rateLimit({ windowMs: 60_000, max: 2, bucket: "unit-test" });
  const req = { ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } };
  let allowed = 0;

  for (let i = 0; i < 2; i += 1) {
    const res = mockResponse();
    middleware(req as any, res as any, () => { allowed += 1; });
    assert.equal(res.statusCode, 200);
  }

  const blockedRes = mockResponse();
  middleware(req as any, blockedRes as any, () => { allowed += 1; });

  assert.equal(allowed, 2);
  assert.equal(blockedRes.statusCode, 429);
  assert.equal((blockedRes.body as any).message, "Too many requests, please try again later.");
}

async function testEnvValidation() {
  const KEYS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"];
  const original = new Map(KEYS.map((key) => [key, process.env[key]]));
  try {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    const missing = getServerEnvIssues();
    assert.ok(missing.some((issue) => issue.key === "SUPABASE_URL"));
    assert.ok(missing.some((issue) => issue.key.includes("SUPABASE_SERVICE_ROLE_KEY")));

    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    const fixed = getServerEnvIssues();
    assert.ok(!fixed.some((issue) => issue.key === "SUPABASE_URL"));
  } finally {
    // Restore per-key: reassigning process.env wholesale replaces the special
    // host object that propagates changes to the environment.
    for (const [key, value] of original) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function testLeaderboardLimit() {
  const { resolveLeaderboardLimit } = await import("../routes/gameRoutes");

  // Regression: an absent ?limit must fall back to the default, not clamp to 1.
  assert.equal(resolveLeaderboardLimit(null), 50);
  assert.equal(resolveLeaderboardLimit(""), 50);
  assert.equal(resolveLeaderboardLimit("abc"), 50);
  assert.equal(resolveLeaderboardLimit("10"), 10);
  assert.equal(resolveLeaderboardLimit("0"), 1);
  assert.equal(resolveLeaderboardLimit("-5"), 1);
  assert.equal(resolveLeaderboardLimit("9999"), 100);
  assert.equal(resolveLeaderboardLimit("7.9"), 7);
}

async function testSupabaseErrorResponse() {
  const { supabaseErrorResponse } = await import("../lib/supabaseServer");

  // Silence the deliberate error logging these assertions provoke.
  const realError = console.error;
  console.error = () => {};
  try {
    // A server-side fault stays a 500 and must not echo the driver's text.
    const internal = supabaseErrorResponse("unit", {
      message: 'relation "public.leaderboard_entries" does not exist',
      code: "42P01",
    });
    assert.equal(internal.status, 500);
    const internalBody = await internal.json();
    assert.equal(internalBody.message, "Internal server error.");
    assert.ok(!JSON.stringify(internalBody).includes("leaderboard_entries"));

    // Postgres class 22/23 are caller-input faults, so 400 rather than 500.
    for (const code of ["22P02", "23514", "23505"]) {
      const res = supabaseErrorResponse("unit", { message: "invalid input syntax for uuid", code });
      assert.equal(res.status, 400, `expected 400 for ${code}`);
      const body = await res.json();
      assert.equal(body.message, "Request could not be processed.");
      assert.ok(!JSON.stringify(body).includes("uuid"));
    }

    // A missing/!unknown code must not be treated as a caller fault.
    const unknown = supabaseErrorResponse("unit", { message: "boom" });
    assert.equal(unknown.status, 500);
    const nullish = supabaseErrorResponse("unit", null);
    assert.equal(nullish.status, 500);
  } finally {
    console.error = realError;
  }
}

// Mirrors the terminal error handler in server.ts.
function terminalStatusFor(err: unknown): number {
  const status = (err as { status?: unknown; statusCode?: unknown } | null)?.status
    ?? (err as { statusCode?: unknown } | null)?.statusCode;
  return typeof status === "number" && status >= 400 && status < 500 ? status : 500;
}

async function testTerminalErrorStatus() {
  // body-parser surfaces malformed JSON as 400 and an oversized body as 413;
  // reporting either as 500 blames the server for the caller's request.
  assert.equal(terminalStatusFor(Object.assign(new Error("Unexpected token"), { status: 400 })), 400);
  assert.equal(terminalStatusFor(Object.assign(new Error("too large"), { status: 413 })), 413);
  assert.equal(terminalStatusFor(Object.assign(new Error("x"), { statusCode: 415 })), 415);

  // Genuine faults and anything untrusted collapse to 500.
  assert.equal(terminalStatusFor(new Error("kaboom")), 500);
  assert.equal(terminalStatusFor(Object.assign(new Error("x"), { status: 503 })), 500);
  assert.equal(terminalStatusFor(Object.assign(new Error("x"), { status: "400" })), 500);
  assert.equal(terminalStatusFor(null), 500);
  assert.equal(terminalStatusFor(undefined), 500);
}

async function testStrictNumberValidation() {
  const middleware = validateBody({ amount: { type: "number", required: true } });
  for (const amount of [true, "5e3", "12"]) {
    const res = mockResponse();
    let nextCalled = false;
    middleware({ body: { amount } } as any, res as any, () => { nextCalled = true; });
    assert.equal(nextCalled, false, `accepted ${JSON.stringify(amount)} as a number`);
    assert.equal(res.statusCode, 400);
  }
}

async function testTokenRejection() {
  const { isTokenRejection } = await import("../lib/supabaseServer");
  assert.equal(isTokenRejection({ status: 401 }), true);
  assert.equal(isTokenRejection({ status: 403 }), true);
  // Outages and network failures are not the caller's token being bad.
  assert.equal(isTokenRejection({ status: 500 }), false);
  assert.equal(isTokenRejection({ status: 503 }), false);
  assert.equal(isTokenRejection({}), false);
}

async function testMarketEngineInSync() {
  const { existsSync } = await import("node:fs");
  const { execFileSync } = await import("node:child_process");
  const path = await import("node:path");
  const script = path.resolve(__dirname, "../../../scripts/sync-market-engine.cjs");
  const clientSource = path.resolve(__dirname, "../../../client/src/data/mockStocks.ts");
  // Deploys that ship only server/ can't compare; CI and local checkouts can.
  if (!existsSync(script) || !existsSync(clientSource)) return;
  execFileSync(process.execPath, [script, "--check"], { stdio: "pipe" });
}

async function testAdvanceTarget() {
  const { resolveAdvanceTarget, MAX_ADVANCE_DAYS } = await import("../routes/marketRoutes");
  assert.deepEqual(resolveAdvanceTarget(5, "infinite", 6), { day: 6 });
  assert.deepEqual(resolveAdvanceTarget(5, "infinite", 5), { day: 5 });
  assert.ok("error" in resolveAdvanceTarget(5, "infinite", 4), "moved backwards");
  assert.ok("error" in resolveAdvanceTarget(5, "infinite", 5 + MAX_ADVANCE_DAYS + 1), "jump too large");
  assert.ok("error" in resolveAdvanceTarget(5, "infinite", "6"), "string day");
  assert.ok("error" in resolveAdvanceTarget(5, "infinite", 6.5), "fractional day");
  // limited_30 clamps to the last day instead of failing.
  assert.deepEqual(resolveAdvanceTarget(29, "limited_30", 45), { day: 30 });
}

async function testGenerationSeed() {
  const { deriveGenerationSeed } = await import("../lib/marketService");
  const a = deriveGenerationSeed("secret-one-0123456789", "limited_30", "ABC234");
  assert.equal(a, deriveGenerationSeed("secret-one-0123456789", "limited_30", "ABC234"));
  assert.match(a, /^[0-9A-F]{16}$/);
  // Knowing the public seed is not enough without the secret.
  assert.notEqual(a, deriveGenerationSeed("secret-two-0123456789", "limited_30", "ABC234"));
  assert.notEqual(a, deriveGenerationSeed("secret-one-0123456789", "infinite", "ABC234"));
}

function fakeScript() {
  const stock = (id: number, symbol: string, sector: string) => ({
    id, symbol, company_name: symbol, sector, industry: sector, description: "",
    initial_price: 100, current_price: 100, volatility: 0.03, trend_bias: 0.001,
    risk_level: "Medium" as const, pe_ratio: 20, eps: 5, revenue_growth: 10,
    profit_margin: 12, debt_to_equity: 0.5, dividend_yield: 1, analyst_rating: "Hold" as const,
    is_active: true,
  });
  const stocks = [stock(1, "CAI", "Technology"), stock(2, "GVE", "Energy")];
  const prices = stocks.flatMap((item) => [1, 2, 3].map((day) => ({
    id: item.id * 10 + day, game_day: day, open_price: 100, high_price: 104, low_price: 97,
    close_price: 100 + day, volume: 1000, event_impact: 0, stocks: { symbol: item.symbol },
  })));
  return { stocks, prices, events: [] };
}

async function testSessionPriceChunking() {
  const { generateSessionPrices } = await import("../market/sessionMarket");
  const script = fakeScript() as any;
  const seed = "0123456789ABCDEF";

  for (const mode of ["infinite", "limited_30"] as const) {
    const whole = generateSessionPrices({ mode, seed, fromDay: 1, toDay: 30, script });
    // Generated in two requests, the second continuing from stored closes.
    const first = generateSessionPrices({ mode, seed, fromDay: 1, toDay: 12, script });
    const previousCloses = Object.fromEntries(first.filter((row) => row.game_day === 12)
      .map((row) => [row.symbol, row.close_price]));
    const second = generateSessionPrices({ mode, seed, fromDay: 13, toDay: 30, script, previousCloses });
    const key = (row: { symbol: string; game_day: number }) => `${row.symbol}:${row.game_day}`;
    const sort = (rows: typeof whole) => [...rows].sort((x, y) => key(x).localeCompare(key(y)));
    assert.deepEqual(sort([...first, ...second]), sort(whole), `${mode} chunked != whole`);
    assert.ok(whole.every((row) => row.close_price > 0));
  }

  // Infinite day 1 is the listing price; scripted day N shows up on day N + 1.
  const infinite = generateSessionPrices({ mode: "infinite", seed, fromDay: 1, toDay: 4, script });
  const cai = infinite.filter((row) => row.symbol === "CAI").sort((x, y) => x.game_day - y.game_day);
  assert.deepEqual(cai.map((row) => row.close_price).slice(0, 4), [100, 101, 102, 103]);
}

// BUG-004: engine-2 infinite runs must not replay the shared script.
async function testScriptlessInfiniteRuns() {
  const { generateSessionPrices, generateSessionNews } = await import("../market/sessionMarket");
  const { scriptlessRun, marketFingerprint } = await import("../lib/marketService");
  const script = scriptlessRun(fakeScript() as any);
  const run = (seed: string) => generateSessionPrices({ mode: "infinite", seed, fromDay: 1, toDay: 30, script })
    .filter((row) => row.symbol === "CAI").sort((x, y) => x.game_day - y.game_day)
    .map((row) => row.close_price);

  const a = run("0123456789ABCDEF");
  const b = run("FEDCBA9876543210");
  assert.equal(a[0], 100, "day 1 is still the listing price");
  assert.notDeepEqual(a.slice(1, 4), [101, 102, 103], "scripted closes must not appear");
  assert.notDeepEqual(a.slice(1), b.slice(1), "two seeds must give two markets");

  // Days 1-3 are the fixed tutorial intro (STORY_DAYS) in every mode; after it
  // the news comes from the seed.
  const scriptedNews = generateSessionNews({ mode: "infinite", seed: "0123456789ABCDEF", day: 5, script });
  const otherNews = generateSessionNews({ mode: "infinite", seed: "FEDCBA9876543210", day: 5, script });
  assert.notDeepEqual(scriptedNews.map((n) => n.headline), otherNews.map((n) => n.headline));

  assert.equal(marketFingerprint({ game_mode: "infinite", game_seed: "ABC234", market_engine: 2 }), "infinite:ABC234:v2");
  assert.equal(marketFingerprint({ game_mode: "infinite", game_seed: "ABC234", market_engine: 1 }), "infinite:ABC234");
  assert.equal(marketFingerprint({ game_mode: "infinite", game_seed: "ABC234" }), "infinite:ABC234");
}

// BUG-006: legacy runs keep the plain seed only for days already seen.
async function testLegacySeedUpgrade() {
  const { legacyPlainSeedThrough } = await import("../lib/marketService");
  const { generateSessionPrices } = await import("../market/sessionMarket");
  assert.equal(legacyPlainSeedThrough({ market_seed_secret: true, current_day: 40 }, "infinite"), 0);
  assert.equal(legacyPlainSeedThrough({ market_seed_secret: null, current_day: 40 }, "infinite"), 0);
  assert.equal(legacyPlainSeedThrough({ market_seed_secret: false, current_day: 40 }, "infinite"), 40);
  assert.equal(legacyPlainSeedThrough({ market_seed_secret: false, current_day: 12 }, "limited_30"), Infinity);

  // Switching seeds mid-run stays continuous: day 41 opens at day 40's close.
  const script = fakeScript() as any;
  const plain = generateSessionPrices({ mode: "infinite", seed: "PLAIN1", fromDay: 1, toDay: 40, script });
  const previousCloses = Object.fromEntries(plain.filter((row) => row.game_day === 40)
    .map((row) => [row.symbol, row.close_price]));
  const secret = generateSessionPrices({ mode: "infinite", seed: "0123456789ABCDEF", fromDay: 41, toDay: 45, script, previousCloses });
  for (const row of secret.filter((item) => item.game_day === 41)) {
    assert.equal(row.open_price, previousCloses[row.symbol], `${row.symbol} gap at the seed switch`);
  }
  const plainOnward = generateSessionPrices({ mode: "infinite", seed: "PLAIN1", fromDay: 41, toDay: 45, script, previousCloses });
  assert.notDeepEqual(secret.map((row) => row.close_price), plainOnward.map((row) => row.close_price),
    "days after the switch must not be computable from the plain seed");
}

async function testNewsSanitized() {
  const { generateSessionNews, sanitizeNews } = await import("../market/sessionMarket");
  const news = generateSessionNews({ mode: "limited_30", seed: "0123456789ABCDEF", day: 1, script: fakeScript() as any });
  assert.ok(news.length > 0);
  for (const item of news.map(sanitizeNews)) {
    assert.equal(item.impactByTicker, undefined);
    assert.equal(item.actualImpact, 0);
    assert.equal(item.expectedImpact, 0);
    assert.equal(item.isAccurate, true);
  }
}

async function testUserRateLimit() {
  const { userRateLimit } = await import("../middleware/rateLimit");
  const allow = userRateLimit({ windowMs: 60_000, max: 2 });
  assert.equal(allow("user-a"), true);
  assert.equal(allow("user-a"), true);
  assert.equal(allow("user-a"), false, "third request in the window is refused");
  assert.equal(allow("user-b"), true, "other users have their own budget");
}

async function testSecretMatches() {
  const { secretMatches } = await import("../lib/supabaseServer");
  assert.equal(secretMatches("correct-horse", "correct-horse"), true);
  assert.equal(secretMatches("correct-hors", "correct-horse"), false, "prefix");
  assert.equal(secretMatches("a much longer guess than the secret", "short"), false, "length differs without throwing");
  assert.equal(secretMatches(undefined, "secret"), false);
  assert.equal(secretMatches("", undefined), false, "no secret configured: nobody is authorized");
}

async function main() {
  await testValidateBody();
  await testRateLimit();
  await testEnvValidation();
  await testLeaderboardLimit();
  await testSupabaseErrorResponse();
  await testTerminalErrorStatus();
  await testStrictNumberValidation();
  await testTokenRejection();
  await testMarketEngineInSync();
  await testAdvanceTarget();
  await testUserRateLimit();
  await testSecretMatches();
  await testGenerationSeed();
  await testSessionPriceChunking();
  await testNewsSanitized();
  await testScriptlessInfiniteRuns();
  await testLegacySeedUpgrade();
  console.log("Server tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
