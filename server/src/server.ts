import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { connectDB } from './db/db';
import supabaseRoutes from './routes/supabaseRoutes';
import gameRoutes from './routes/gameRoutes';
import { rateLimit } from './middleware/rateLimit';
import { getServerEnvIssues } from './lib/env';

dotenv.config({ path: './.env' });

const app = express();

let dbStatus: 'pending' | 'ok' | 'error' = 'pending';

// Behind a hosting proxy (Render/Railway) so req.ip reflects the real client.
app.set('trust proxy', 1);

// Lock CORS to configured origins in production; reflect the request origin in
// dev (when CLIENT_ORIGIN is unset).
const allowedOrigins = (process.env.CLIENT_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && allowedOrigins.length === 0) {
  console.error(
    '[cors] CLIENT_ORIGIN is not set in production. Cross-origin browser requests will be rejected.'
  );
}

app.use(
  cors({
    // Fail closed in production: reflecting an arbitrary origin alongside
    // credentials would let any site call the API on a user's behalf. Only dev
    // (CLIENT_ORIGIN unset, NODE_ENV not production) gets the permissive echo.
    origin: allowedOrigins.length > 0 ? allowedOrigins : !isProduction,
    credentials: true,
  })
);
app.use(bodyParser.json());

// Liveness probe. Registered before the rate limiter and before any route that
// touches Supabase, so the platform healthcheck reflects "process is up" and is
// never rejected by the global cap. Readiness/config detail lives at
// /api/health/config. This shadows the /health route in supabaseRoutes.
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', db: dbStatus });
});

// Global request cap per IP across the API.
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, bucket: 'global' }));

app.use('/api', supabaseRoutes);
app.use('/api', gameRoutes);

app.get('/api/health/config', (req: Request, res: Response) => {
  const issues = getServerEnvIssues();
  const status = issues.some((issue) => issue.key === 'SUPABASE_URL') ? 503 : 200;

  // Which env keys are missing is reconnaissance for an unauthenticated caller.
  // Once ADMIN_API_SECRET is configured, the detail requires it; without it the
  // endpoint still reports healthy/unhealthy so the platform probe stays useful.
  const adminSecret = process.env.ADMIN_API_SECRET;
  const authorized = !adminSecret || req.get('x-admin-secret') === adminSecret;

  res.status(status).json({
    status: issues.length === 0 ? 'ok' : 'warning',
    issueCount: issues.length,
    ...(authorized ? { issues: issues.map(({ key, message }) => ({ key, message })) } : {}),
  });
});

app.get('/home', (req: Request, res: Response) => {
  res.send('StockPilot API');
});

app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ message: 'Not found.' });
});

// Terminal error handler. Express's default would serialize the stack trace to
// the client whenever NODE_ENV is not exactly "production" — which nothing here
// guarantees — so always log server-side and return an opaque body.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled request error:', err);
  if (res.headersSent) return;

  // body-parser reports malformed JSON as 400 and an oversized body as 413.
  // Reporting those as 500 tells the caller the server broke when the request
  // was at fault. Only 4xx is trusted from the error object; any other value
  // (including a 5xx a dependency invented) is an internal fault.
  const status = (err as { status?: unknown; statusCode?: unknown } | null)?.status
    ?? (err as { statusCode?: unknown } | null)?.statusCode;

  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({
      message: status === 413 ? 'Request body too large.' : 'Bad request.',
    });
    return;
  }

  res.status(500).json({ message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;

// Bind first, verify the database after. A Supabase outage or a missing
// credential should surface as a running server reporting db: "error" — not as
// a container that never binds and fails its healthcheck with no explanation.
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  connectDB()
    .then(() => {
      dbStatus = 'ok';
      console.log('Database connection established.');
    })
    .catch((err) => {
      dbStatus = 'error';
      console.error('Database connection check failed. API routes needing Supabase will fail:', err);
    });
});
