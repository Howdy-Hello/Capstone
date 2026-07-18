import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables.");
}

if (!/^https?:\/\//.test(supabaseUrl)) {
  throw new Error(
    "REACT_APP_SUPABASE_URL must be a full URL, for example https://your-project-ref.supabase.co."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
