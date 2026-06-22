import { withSupabase, WithSupabaseConfig, SupabaseContext } from '@supabase/server';
import { NextFunction, Request as ExpressRequest, RequestHandler, Response as ExpressResponse } from 'express';

type SupabaseFetchHandler = (req: Request, ctx: SupabaseContext) => Promise<Response>;

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
    init.body = typeof req.body === 'string' || Buffer.isBuffer(req.body)
      ? req.body
      : JSON.stringify(req.body);
  }

  return new Request(url, init);
}

async function sendFetchResponse(res: ExpressResponse, response: Response): Promise<void> {
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));

  if (!response.body) {
    res.end();
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());
  res.send(body);
}

export function supabaseHandler(config: WithSupabaseConfig, handler: SupabaseFetchHandler): RequestHandler {
  const fetchHandler = withSupabase(config, handler);

  return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    try {
      const response = await fetchHandler(toFetchRequest(req));
      await sendFetchResponse(res, response);
    } catch (error) {
      next(error);
    }
  };
}
