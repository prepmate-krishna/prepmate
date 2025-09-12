// pages/api/get-scheduled-test.js
// Server-only endpoint: returns a scheduled test if it belongs to the given supabase user id.
// Expects POST JSON body: { scheduledTestId: "<uuid>", supabaseUserId: "<auth user id>" }

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase env vars in get-scheduled-test.js");
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { scheduledTestId, supabaseUserId } = req.body ?? {};

    if (!scheduledTestId || !supabaseUserId) {
      return res.status(400).json({ error: "Missing scheduledTestId or supabaseUserId" });
    }

    // 1) Fetch the scheduled_tests row
    const { data: schedRows, error: schedErr } = await sb
      .from("scheduled_tests")
      .select("id, test_payload, user_id, status, scheduled_for, created_at")
      .eq("id", scheduledTestId)
      .limit(1);

    if (schedErr) {
      console.error("Error fetching scheduled_tests:", schedErr);
      return res.status(500).json({ error: "Failed to fetch scheduled test", details: schedErr.message });
    }
    if (!schedRows || schedRows.length === 0) {
      return res.status(404).json({ error: "Scheduled test not found" });
    }

    const sched = schedRows[0];

    // 2) Confirm the scheduled_tests.user_id belongs to the requesting supabase auth user (ext_id)
    const { data: userRows, error: userErr } = await sb
      .from("users")
      .select("id, ext_id, email, phone")
      .eq("id", sched.user_id)
      .limit(1);

    if (userErr) {
      console.error("Error fetching user for scheduled test:", userErr);
      return res.status(500).json({ error: "Failed to resolve user", details: userErr.message });
    }
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ error: "Owner user not found for this scheduled test" });
    }

    const owner = userRows[0];

    if (String(owner.ext_id) !== String(supabaseUserId)) {
      // Not allowed
      return res.status(403).json({ error: "Not authorized to view this scheduled test" });
    }

    // 3) All good — return test payload (JSON) and some metadata
    return res.status(200).json({
      success: true,
      test: sched.test_payload ?? null,
      metadata: {
        scheduledTestId: sched.id,
        status: sched.status,
        scheduled_for: sched.scheduled_for,
        created_at: sched.created_at,
        owner: { id: owner.id, email: owner.email, phone: owner.phone },
      },
    });
  } catch (err) {
    console.error("get-scheduled-test error:", err);
    return res.status(500).json({ error: "Server error", details: err?.message ?? String(err) });
  }
}
