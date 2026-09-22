import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Missing credentials must not throw at import time: that kills the process
// before the HTTP server binds, so the platform healthcheck sees a dead
// container instead of a running app reporting a config problem.
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function connectDB(): Promise<void> {
  if (!supabase) {
    throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are not set.');
  }
  const { error } = await supabase.from('profiles').select('id').limit(1);
  if (error) throw new Error(`Supabase connection check failed: ${error.message}`);
  console.log('Connected to Supabase successfully!');
}
