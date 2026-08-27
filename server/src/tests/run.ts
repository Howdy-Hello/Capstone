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

async function main() {
  await testValidateBody();
  await testRateLimit();
  await testEnvValidation();
  await testLeaderboardLimit();
  await testSupabaseErrorResponse();
  await testTerminalErrorStatus();
  console.log("Server tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
