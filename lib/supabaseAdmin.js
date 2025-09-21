// lib/supabaseAdmin.js
import { createClient } from "@supabase/supabase-js";

// These env var names are the same as in Vercel / .env.local
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  // disable emitting telemetry for security in server env
  global: { fetch: global.fetch },
});

export default supabaseAdmin;
