// pages/api/get-reports.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sb = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { supabaseUserId } = req.body ?? {};
    if (!supabaseUserId) {
      console.error("❌ get-reports: no supabaseUserId provided");
      return res.status(400).json({ error: "Missing supabaseUserId" });
    }

    // Step 1: fetch user
    const { data: users, error: userErr } = await sb
      .from("users")
      .select("id, ext_id")
      .eq("ext_id", supabaseUserId)
      .limit(1);

    if (userErr) {
      console.error("❌ get-reports: userErr", userErr);
      return res.status(500).json({ error: "Failed to lookup user", details: userErr.message });
    }
    if (!users || users.length === 0) {
      console.log("ℹ️ get-reports: no user found for supabaseUserId", supabaseUserId);
      return res.status(200).json({ reports: [] });
    }

    const userId = users[0].id;

    // Step 2: fetch reports (without join for now, keep it simple)
    const { data: reports, error: repErr } = await sb
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (repErr) {
      console.error("❌ get-reports: repErr", repErr);
      return res.status(500).json({ error: "Failed to fetch reports", details: repErr.message });
    }

    console.log("✅ get-reports: found", reports.length, "reports for userId", userId);

    // Step 3: filter manually in JS (safe fallback)
    const filtered = reports.filter(r => r.user_id === userId || r.test_id);

    return res.status(200).json({ reports: filtered });
  } catch (err) {
    console.error("❌ get-reports crash:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}
