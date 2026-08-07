import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  NextFunction,
  Request as ExpressRequest,
  RequestHandler,
  Response as ExpressResponse,
} from 'express';
import { getServerEnvIssues } from './env';

// Local re-implementation of the "withSupabase" helper. The previously-imported
// "@supabase/server" package does not exist, so the API server could not start.
// This provides the same request-handler shape (auth: none | user | secret) on
// top of the installed "@supabase/supabase-js" client.

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey =
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const adminSecret = process.env.ADMIN_API_SECRET;

// Report config problems loudly, but never throw during module evaluation —
// that would crash the process before the HTTP server binds and turn a fixable
// misconfiguration into an unexplained "container never became healthy".
const envIssues = getServerEnvIssues();
for (const issue of envIssues) {
  console.error(`[env] ${issue.key}: ${issue.message}`);
}

const isConfigured = Boolean(supabaseUrl && serviceRoleKey);

// When credentials are absent, hand out a client that throws on first *use*.
// Requests then fail individually with a clear message while /api/health stays
// up to report the cause.
function unconfiguredClient(): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get() {
      throw new Error(
        'Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).'
      );
    },
  });
}

const supabaseAdmin: SupabaseClient = isConfigured
  ? createClient(supabaseUrl as string, serviceRoleKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : unconfiguredClient();

export type AuthMode = 'none' | 'user' | 'secret';

export interface WithSupabaseConfig {
  auth: AuthMode;
}

export interface SupabaseContext {
  /** Request-scoped client — carries the caller's JWT (RLS-enforced) when present. */
  supabase: SupabaseClient;
  /** Service-role client — bypasses RLS. Use for admin operations only. */
  supabaseAdmin: SupabaseClient;
  /** Decoded user (id + JWT/user fields), or null for unauthenticated requests. */
  userClaims: (Record<string, unknown> & { id: string }) | null;
}

type SupabaseFetchHandler = (req: Request, ctx: SupabaseContext) => Promise<Response>;

function getBearerToken(req: ExpressRequest): string | null {
  const header = req.get('authorization') ?? req.get('Authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

function userScopedClient(token: string): SupabaseClient {
  // Prefer the anon key + user JWT so RLS applies; fall back to a service-role
  // client still carrying the user's token if no anon key is configured.
  return createClient(supabaseUrl as string, anonKey ?? (serviceRoleKey as string), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

type AuthResult =
  | { ok: true; ctx: SupabaseContext }
  | { ok: false; status: number; message: string };

async function buildContext(
  config: WithSupabaseConfig,
  req: ExpressRequest
): Promise<AuthResult> {
  if (config.auth === 'none') {
    return { ok: true, ctx: { supabase: supabaseAdmin, supabaseAdmin, userClaims: null } };
  }

  if (config.auth === 'secret') {
    const provided = req.get('x-admin-secret') ?? getBearerToken(req);
    if (!adminSecret || provided !== adminSecret) {
      return { ok: false, status: 403, message: 'Forbidden.' };
    }
    return { ok: true, ctx: { supabase: supabaseAdmin, supabaseAdmin, userClaims: null } };
  }

  // config.auth === 'user'
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, message: 'Missing bearer token.' };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, message: 'Invalid or expired token.' };
  }

  const userClaims = { ...data.user, id: data.user.id } as Record<string, unknown> & {
    id: string;
  };

  return {
    ok: true,
    ctx: { supabase: userScopedClient(token), supabaseAdmin, userClaims },
  };
}

function toFetchRequest(req: ExpressRequest): Request {
  const origin = `${req.protocol}://${req.get('host')}`;
  const url = new URL(req.originalUrl, origin);
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry));
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const method = req.method.toUpperCase();
  const init: RequestInit = { method, headers };

  if (method !== 'GET' && method !== 'HEAD' && req.body !== undefined) {
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    init.body =
      typeof req.body === 'string' || Buffer.isBuffer(req.body)
        ? req.body
        : JSON.stringify(req.body);
  }

  return new Request(url, init);
}

// Headers that must not be blindly forwarded: the body is already decoded by
// arrayBuffer(), and length/encoding would then be wrong.
const SKIP_RESPONSE_HEADERS = new Set(['content-encoding', 'content-length', 'transfer-encoding']);

async function sendFetchResponse(res: ExpressResponse, response: Response): Promise<void> {
  res.status(response.status);
  response.headers.forEach((value, key) => {
    if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());
  res.send(body);
}

export function supabaseHandler(
  config: WithSupabaseConfig,
  handler: SupabaseFetchHandler
): RequestHandler {
  return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    try {
      const auth = await buildContext(config, req);
      if (!auth.ok) {
        res.status(auth.status).json({ message: auth.message });
        return;
      }
      const response = await handler(toFetchRequest(req), auth.ctx);
      await sendFetchResponse(res, response);
    } catch (error) {
      next(error);
    }
  };
}
