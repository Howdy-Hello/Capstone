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
  const original = { ...process.env };
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
    process.env = original;
  }
}

async function main() {
  await testValidateBody();
  await testRateLimit();
  await testEnvValidation();
  console.log("Server tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
