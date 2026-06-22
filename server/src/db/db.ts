import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function connectDB(): Promise<void> {
  const { error } = await supabase.from('profiles').select('id').limit(1);
  if (error) throw new Error(`Supabase connection check failed: ${error.message}`);
  console.log('Connected to Supabase successfully!');
}
