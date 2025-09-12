// pages/api/save-report.js
// Saves test metadata + AI report server-side into Supabase (tests + reports tables).
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE config in env. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY exist.");
}

const sb = createClient(supabaseUrl, supabaseServiceKey);

/*
Expected POST body:
{
  supabaseUserId: "<auth user id (supabase)>",
  userId: "<public.users.id UUID>",            // optional if you want to store reference to users table id
  generatedFromUploadId: "<optional upload id>", // optional
  test: {
    type: "MCQ" | "Q&A" | "Mixed",
    num_questions: 5,
    questions: [ { question, options?, answer } ... ]
  },
  report: {
    totalQuestions: number,
    attempted: number,
    attemptedCorrect: number,
    attemptedWrong: number,
    weakTopics: [ ... ],
    explanations: [ { index, question, explanation, references? } ... ]
  }
}
Response: { success: true, testId: "...", reportId: "..." }
*/

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const payload = req.body ?? {};
    const { supabaseUserId, userId, generatedFromUploadId, test, report } = payload;

    if (!supabaseUserId || !test || !report) {
      return res.status(400).json({ error: "Missing required fields: supabaseUserId, test, report" });
    }

    // Step 1: Find public.users.id (user_id) if userId not provided
    let finalUserId = userId ?? null;
    if (!finalUserId) {
      const { data: userRows, error: uErr } = await sb
        .from("users")
        .select("id, ext_id")
        .eq("ext_id", supabaseUserId)
        .limit(1);

      if (uErr) {
        console.error("Error querying users table:", uErr);
        return res.status(500).json({ error: "Failed to lookup user" });
      }
      if (userRows && userRows.length > 0) finalUserId = userRows[0].id;
      else {
        // Create mapping if not exists
        const { data: ins, error: insErr } = await sb
          .from("users")
          .insert([{ ext_id: supabaseUserId, email: null }])
          .select("id")
          .limit(1);
        if (insErr) {
          console.error("Insert user mapping error:", insErr);
          return res.status(500).json({ error: "Failed to create user mapping" });
        }
        finalUserId = ins && ins.length > 0 ? ins[0].id : null;
      }
    }

    if (!finalUserId) {
      return res.status(500).json({ error: "Unable to resolve user id" });
    }

    // Step 2: Insert into tests table
    const testPayload = {
      user_id: finalUserId,
      source_upload_id: generatedFromUploadId ?? null,
      type: test.type || null,
      num_questions: test.num_questions ?? (Array.isArray(test.questions) ? test.questions.length : null)
    };

    const { data: testIns, error: testErr } = await sb
      .from("tests")
      .insert([testPayload])
      .select("id")
      .limit(1);

    if (testErr) {
      console.error("Insert test error:", testErr);
      return res.status(500).json({ error: "Failed to save test metadata" });
    }

    const testId = testIns && testIns.length > 0 ? testIns[0].id : null;

    // Step 3: Insert report (link to testId)
    const reportPayload = {
      test_id: testId,
      total_questions: report.totalQuestions ?? null,
      attempted: report.attempted ?? null,
      correct: report.attemptedCorrect ?? null,
      wrong: report.attemptedWrong ?? null,
      weak_topics: Array.isArray(report.weakTopics) ? report.weakTopics : null,
      ai_explanations: Array.isArray(report.explanations) ? report.explanations : null
    };

    const { data: repIns, error: repErr } = await sb
      .from("reports")
      .insert([reportPayload])
      .select("id")
      .limit(1);

    if (repErr) {
      console.error("Insert report error:", repErr);
      return res.status(500).json({ error: "Failed to save report" });
    }

    const reportId = repIns && repIns.length > 0 ? repIns[0].id : null;

    return res.status(200).json({ success: true, testId, reportId });
  } catch (err) {
  // improved logging: include message and stack so you can read terminal output
  console.error("save-report error:", err);
  return res.status(500).json({
    error: "Server error",
    details: err?.message ?? String(err),
    stack: err?.stack ?? null
  });
}

  }
