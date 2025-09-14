/*
  pages/lib/supabase.js (shim)
  Re-exports named exports from the real lib at repo root,
  and provides a harmless default React component to satisfy Next.js page rules.
*/
import React from "react";
import supabaseDefault, { supabaseAdmin, supabaseClient, supabase } from "../../lib/supabase.js";

export { supabaseAdmin, supabaseClient, supabase };
export default function SupabaseShimPage() {
  // This page shouldn't be visited — it's a shim to satisfy imports during build.
  return null;
}
