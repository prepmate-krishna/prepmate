// lib/supabase.js
// Defensive Supabase initializer suitable for Next.js:
// - supabaseClient: created for browser code using NEXT_PUBLIC_SUPABASE_ANON_KEY
// - supabaseAdmin: created only on server (node) when SUPABASE_SERVICE_ROLE_KEY is present
// - exports supabase (alias), supabaseClient, supabaseAdmin, and default

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/** Create anon client (safe to run in browser) */
let supabaseClient = null;
try {
  if (URL && ANON) {
    supabaseClient = createClient(URL, ANON);
  } else {
    // keep null if missing — consumers should handle null and show error messages on usage
    supabaseClient = null;
    // console.warn("lib/supabase: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing.");
  }
} catch (e) {
  // defensive: do not crash during client bundle
  console.error("lib/supabase: failed to create anon client", e);
  supabaseClient = null;
}

/** Create admin client ONLY on server (Node) — prevents leaking service key to client bundle */
let supabaseAdmin = null;
try {
  if (typeof window === "undefined" && URL && SERVICE) {
    supabaseAdmin = createClient(URL, SERVICE);
  } else {
    supabaseAdmin = null;
  }
} catch (e) {
  console.error("lib/supabase: failed to create admin client", e);
  supabaseAdmin = null;
}

// Provide common alias for older imports
const supabase = supabaseClient || supabaseAdmin || null;

// Fallback default that throws helpful errors when used incorrectly
const fallback = {
  from: () => { throw new Error("Supabase client not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and keys are set."); },
  rpc: () => { throw new Error("Supabase client not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and keys are set."); },
};

const defaultExport = supabaseAdmin || supabaseClient || fallback;

export { supabaseAdmin, supabaseClient, supabase };
export default defaultExport;
c