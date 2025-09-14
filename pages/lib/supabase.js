/*
  pages/lib/supabase.js (shim)
  Import the real helpers from the repo root and re-export named/default exports.
  This avoids using `export * from` which Next disallows inside pages/.
*/
import supabaseDefault, { supabaseAdmin, supabaseClient } from "../../lib/supabase.js";

export { supabaseAdmin, supabaseClient };
export default supabaseDefault;
