import express, { Request, Response } from 'express';
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

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
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

app.get('/api/health/config', (_req: Request, res: Response) => {
  const issues = getServerEnvIssues();
  const safeIssues = issues.map(({ key, message }) => ({ key, message }));
  res.status(issues.some((issue) => issue.key === 'SUPABASE_URL') ? 503 : 200).json({
    status: issues.length === 0 ? 'ok' : 'warning',
    issues: safeIssues,
  });
});

app.get('/home', (req: Request, res: Response) => {
  res.send('StockPilot API');
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
