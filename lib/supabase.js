// lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.warn("lib/supabase: NEXT_PUBLIC_SUPABASE_URL not set");
}

if (!SUPABASE_SERVICE_KEY) {
  console.warn("lib/supabase: SUPABASE_SERVICE_ROLE_KEY not set (server-only key)");
}

// Export two helpers: client (server) and anonClient (browser)
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
export const supabaseClient = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
