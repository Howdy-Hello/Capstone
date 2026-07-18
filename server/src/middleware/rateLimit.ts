import { NextFunction, Request, Response } from 'express';

// Dependency-free, in-memory fixed-window rate limiter. Good enough for a single
// API instance (which is how StockPilot deploys). For a multi-instance setup,
// swap the Map for a shared store (e.g. Redis).

type Bucket = { count: number; resetAt: number };

export type RateLimitOptions = {
  windowMs: number;
  max: number;
  message?: string;
  /** Distinguish limiters that share an IP (e.g. "auth" vs "global"). */
  bucket?: string;
};

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message = 'Too many requests, please try again later.', bucket = '' } = options;
  const hits = new Map<string, Bucket>();

  function sweep(now: number) {
    if (hits.size < 10000) return;
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${bucket}:${ip}`;

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      sweep(now);
      res.status(429).json({ message });
      return;
    }

    sweep(now);
    next();
  };
}
