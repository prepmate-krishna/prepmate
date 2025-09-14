/*
  lib/supabase.js
  Exports:
   - supabaseAdmin (server)
   - supabaseClient (anon client)
   - supabase (alias to supabaseClient for code that imports { supabase })
   - default export = supabaseAdmin
*/
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Some modules import { supabase } — provide that alias to the client instance
export const supabase = supabaseClient;

export default supabaseAdmin;
