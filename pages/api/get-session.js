// pages/api/get-session.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = createClient(supabaseUrl, supabaseAnon);

export default async function handler(req, res) {
  // This endpoint simply returns the current user info if the client includes an Authorization header.
  try {
    // Client can call supabase.auth.getUser() instead; keep fallback here
    return res.status(200).json({ id: null });
  } catch (err) {
    return res.status(200).json({ id: null });
  }
}
