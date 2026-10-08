import { getMarketSecret } from './marketService';

type EnvIssue = {
  key: string;
  message: string;
};

const SERVICE_ROLE_KEYS = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"];
const ANON_KEYS = ["SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY"];

function hasAnyEnv(keys: string[]) {
  return keys.some((key) => Boolean(process.env[key]));
}

function isUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getServerEnvIssues(): EnvIssue[] {
  const issues: EnvIssue[] = [];

  if (!isUrl(process.env.SUPABASE_URL)) {
    issues.push({
      key: "SUPABASE_URL",
      message: "SUPABASE_URL must be a full http(s) Supabase project URL.",
    });
  }

  if (!hasAnyEnv(SERVICE_ROLE_KEYS)) {
    issues.push({
      key: SERVICE_ROLE_KEYS.join(" or "),
      message: "A Supabase service role key is required for server-side admin operations.",
    });
  }

  if (!hasAnyEnv(ANON_KEYS)) {
    issues.push({
      key: ANON_KEYS.join(" or "),
      message: "SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY is required for user-scoped API routes; account routes and game sync cannot work without it.",
    });
  }

  if (!getMarketSecret()) {
    issues.push({
      key: "MARKET_SEED_SECRET",
      message: "Set a stable, server-only MARKET_SEED_SECRET of at least 16 characters. It is required in production and must stay unchanged for active runs.",
    });
  }

  if (process.env.CLIENT_ORIGIN && !process.env.CLIENT_ORIGIN.split(",").every((origin) => isUrl(origin.trim()))) {
    issues.push({
      key: "CLIENT_ORIGIN",
      message: "CLIENT_ORIGIN must be a comma-separated list of full http(s) origins.",
    });
  }

  return issues;
}

export function getServerConfigStatus(issues = getServerEnvIssues()): 200 | 503 {
  const blocking = ["SUPABASE_URL", SERVICE_ROLE_KEYS.join(" or "), ANON_KEYS.join(" or "), "MARKET_SEED_SECRET"];
  return issues.some((issue) => blocking.includes(issue.key)) ? 503 : 200;
}

// Deliberately no assertServerEnv()/throwing variant here. Config problems must
// be reported by a running server (see /api/health/config), never raised during
// module evaluation — that kills the process before it binds a port and turns a
// one-line misconfiguration into an unexplained failed deploy.
