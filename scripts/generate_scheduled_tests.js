// scripts/generate_scheduled_tests.js
// One-file scheduler with Twilio WhatsApp reminder integration.
// Run from project root: `node scripts/generate_scheduled_tests.js`
// Make sure you installed: dotenv, @supabase/supabase-js, openai, twilio
// npm install dotenv @supabase/supabase-js openai twilio

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import twilio from "twilio";

//
// Load .env.local explicitly (so this works when executed from anywhere)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

//
// Config / clients
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY exist in .env.local");
  process.exit(1);
}
if (!OPENAI_KEY) {
  console.error("Missing OPENAI_API_KEY in env.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_KEY });

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
let twilioClient = null;
if (TWILIO_SID && TWILIO_TOKEN) {
  twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);
} else {
  console.warn("Twilio not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_WHATSAPP_FROM). WhatsApp reminders will be skipped.");
}

//
// Helpers
function isoNow() {
  return new Date().toISOString();
}

async function fetchDueSchedules() {
  const { data: schedules, error } = await sb
    .from("test_schedules")
    .select("*")
    .eq("enabled", true);

  if (error) throw error;
  if (!schedules || schedules.length === 0) return [];

  // simple due check: last_run null or older than ~23 hours
  const due = schedules.filter((s) => {
    if (!s.last_run) return true;
    const last = new Date(s.last_run);
    const diffHours = (Date.now() - last.getTime()) / (1000 * 60 * 60);
    return diffHours > 23;
  });

  return due;
}

async function getRecentUploadsForUser(user_id, limit = 5) {
  const { data, error } = await sb
    .from("uploads")
    .select("id, filename, path, bucket, mime, size, created_at")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("Error fetching uploads for user", user_id, error.message);
    return [];
  }
  return data || [];
}

function buildPromptFromUploads(uploads, count = 5) {
  if (!uploads || uploads.length === 0) {
    return `Create a ${count}-question MCQ test on general high-school level biology: cells, mitochondria, photosynthesis, and DNA. Output a JSON array only. For each MCQ return: { "question": "...", "options": ["...","...","...","..."], "answer": "A" }`;
  }
  const lines = uploads.map((u, i) => `${i + 1}. ${u.filename}`);
  return `Create a ${count}-question MCQ test using the following uploaded study materials:\n${lines.join("\n")}\n\nOutput JSON array only. For each MCQ return: { "question": "...", "options": ["opt1","opt2","opt3","opt4"], "answer": "A" }`;
}

async function generateTestWithOpenAI(prompt, count = 5, type = "MCQ") {
  const system = `You are an exam prep assistant. Generate exactly ${count} ${type} questions as a JSON array. For MCQ items use: { "question":"...", "options":["A","B","C","D"], "answer":"A" }`;
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 1000,
  });

  const raw = resp.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/```(?:json)?\s*([\s\S]*?)```/gi, "$1").trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const arrayMatch = cleaned.match(/(\[[\s\S]*\])/m);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[1]);
      } catch (ee) {
        console.error("OpenAI returned unparsable JSON even after extraction. Raw:", cleaned);
        throw new Error("OpenAI response unparsable");
      }
    }
    console.error("OpenAI raw (no JSON found):", cleaned);
    throw e;
  }
}

async function insertScheduledTest(schedule, user_id, testPayload) {
  const scheduled_for = new Date().toISOString();
  const insert = {
    schedule_id: schedule.id,
    user_id,
    generated_from_upload_id: null,
    test_payload: testPayload,
    status: "pending",
    scheduled_for,
  };

  const { data, error } = await sb.from("scheduled_tests").insert([insert]).select("id").limit(1);
  if (error) {
    console.error("Failed to insert scheduled_tests:", error);
    throw error;
  }
  return data && data[0] ? data[0].id : null;
}

async function markScheduleRun(schedule_id) {
  const { error } = await sb
    .from("test_schedules")
    .update({ last_run: isoNow(), updated_at: isoNow() })
    .eq("id", schedule_id);
  if (error) console.warn("Failed to mark schedule last_run", schedule_id, error.message);
}

async function getUserPhone(user_id) {
  const { data, error } = await sb.from("users").select("phone").eq("id", user_id).limit(1);
  if (error) {
    console.error("Error fetching user phone:", error.message);
    return null;
  }
  return data && data[0] ? data[0].phone : null;
}

async function sendWhatsappReminder(user_id, scheduledTestId, testPayload) {
  if (!twilioClient || !TWILIO_FROM) {
    console.warn("Twilio not configured. Skipping WhatsApp send.");
    return;
  }

  const phone = await getUserPhone(user_id);
  if (!phone) {
    console.warn("No phone found for user", user_id);
    return;
  }

  const message = `📚 PrepMate Reminder:\nYour scheduled test is ready!\nTest ID: ${scheduledTestId}\nQuestions: ${Array.isArray(testPayload) ? testPayload.length : "?"}\nLog in to take your test.`;

  try {
    await twilioClient.messages.create({
      from: TWILIO_FROM,
      to: `whatsapp:${phone}`,
      body: message,
    });
    console.log("✅ WhatsApp reminder sent to", phone);
    await sb.from("reminder_logs").insert([{
      scheduled_test_id: scheduledTestId,
      user_id,
      channel: "whatsapp",
      message,
      success: true,
      meta: { sent_at: isoNow() },
    }]);
  } catch (err) {
    console.error("❌ Failed to send WhatsApp message:", err?.message ?? err);
    await sb.from("reminder_logs").insert([{
      scheduled_test_id: scheduledTestId,
      user_id,
      channel: "whatsapp",
      message,
      success: false,
      meta: { error: String(err) },
    }]);
  }
}

//
// --- REPLACED: process existing pending scheduled_tests (user + parent notify) ---
// This replaces earlier simple processing; it includes parent notify for Elite/Elite+
async function fetchDueScheduledTestsAndNotify() {
  const nowIso = new Date().toISOString();
  const { data: dueRows, error } = await sb
    .from("scheduled_tests")
    .select("id, user_id, test_payload, scheduled_for, status")
    .lte("scheduled_for", nowIso)
    .eq("status", "pending")
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (error) {
    console.warn("fetchDueScheduledTestsAndNotify error:", error.message || error);
    return [];
  }
  if (!dueRows || dueRows.length === 0) return [];

  for (const row of dueRows) {
    try {
      console.log("Processing pending scheduled_test", row.id, "user", row.user_id);

      // 1) Send user WhatsApp reminder
      await sendWhatsappReminder(row.user_id, row.id, row.test_payload);

      // 2) Parent notify: only for Elite / Elite+ users with verified parent_phone
      try {
        const { data: userRows, error: uErr } = await sb
          .from("users")
          .select("id, email, plan, parent_phone, parent_verified")
          .eq("id", row.user_id)
          .limit(1);

        if (uErr) {
          console.warn("Parent notify fetch error for user", row.user_id, uErr.message || uErr);
        } else if (!userRows || userRows.length === 0) {
          console.warn("Parent notify: user not found for id", row.user_id);
        } else {
          const userRow = userRows[0];
          const plan = (userRow.plan || "").toLowerCase();
          const isElite = plan === "elite" || plan === "elite+";
          const phone = userRow.parent_phone ? String(userRow.parent_phone).trim() : null;
          const verified = !!userRow.parent_verified;

          if (isElite && phone && verified && twilioClient && TWILIO_FROM) {
            const e164 = phone.startsWith("+") ? phone : `+91${phone}`;
            try {
              await twilioClient.messages.create({
                from: TWILIO_FROM,
                to: `whatsapp:${e164}`,
                body: `Hello — PrepMate Alert:\n\nYour child (${userRow.email || "student"}) has a scheduled test ready. Test ID: ${row.id}`
              });
              console.log(`📢 Parent WhatsApp sent to ${e164} for scheduled_test ${row.id}`);
            } catch (sendErr) {
              console.error("Parent WhatsApp send error:", sendErr?.message ?? sendErr);
            }
          } else {
            if (!isElite) console.log(`Skipping parent notify: user ${row.user_id} not in Elite/Elite+ (plan=${userRow.plan}).`);
            if (!phone) console.log(`Skipping parent notify: no parent_phone for user ${row.user_id}.`);
            if (!verified) console.log(`Skipping parent notify: parent not verified for user ${row.user_id}.`);
          }
        }
      } catch (pnErr) {
        console.warn("Parent notify inner error (ignored):", pnErr?.message ?? pnErr);
      }

      // 3) OPTIONAL: mark row as 'notified' to avoid repeated reminders.
      // Uncomment if you want the scheduler to update status to 'notified' after sending.
      /*
      const { error: updErr } = await sb
        .from("scheduled_tests")
        .update({ status: "notified", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (updErr) console.warn("Failed to update scheduled_test status for", row.id, updErr.message);
      */

    } catch (err) {
      console.error("Error processing scheduled_test", row.id, err?.message ?? err);
    }
  }

  return dueRows;
// --- REPLACE existing fetchDueScheduledTestsAndNotify() with this ---
async function fetchDueScheduledTestsAndNotify() {
  const nowIso = new Date().toISOString();
  const { data: dueRows, error } = await sb
    .from("scheduled_tests")
    .select("id, user_id, test_payload, scheduled_for, status")
    .lte("scheduled_for", nowIso)
    .eq("status", "pending")
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (error) {
    console.warn("fetchDueScheduledTestsAndNotify error:", error.message || error);
    return [];
  }
  if (!dueRows || dueRows.length === 0) return [];

  for (const row of dueRows) {
    try {
      console.log("Processing pending scheduled_test", row.id, "user", row.user_id);

      // 1) Send user WhatsApp reminder
      await sendWhatsappReminder(row.user_id, row.id, row.test_payload);

      // 2) Parent notify: only for Elite / Elite+ users with verified parent_phone
      try {
        const { data: userRows, error: uErr } = await sb
          .from("users")
          .select("id, email, plan, parent_phone, parent_verified")
          .eq("id", row.user_id)
          .limit(1);

        if (uErr) {
          console.warn("Parent notify fetch error for user", row.user_id, uErr.message || uErr);
        } else if (!userRows || userRows.length === 0) {
          console.warn("Parent notify: user not found for id", row.user_id);
        } else {
          const userRow = userRows[0];
          const plan = (userRow.plan || "").toLowerCase();
          const isElite = plan === "elite" || plan === "elite+";
          const phone = userRow.parent_phone ? String(userRow.parent_phone).trim() : null;
          const verified = !!userRow.parent_verified;

          if (isElite && phone && verified && twilioClient && TWILIO_FROM) {
            const e164 = phone.startsWith("+") ? phone : `+91${phone}`;
            try {
              await twilioClient.messages.create({
                from: TWILIO_FROM,
                to: `whatsapp:${e164}`,
                body: `Hello — PrepMate Alert:\n\nYour child (${userRow.email || "student"}) has a scheduled test ready. Test ID: ${row.id}`
              });
              console.log(`📢 Parent WhatsApp sent to ${e164} for scheduled_test ${row.id}`);
            } catch (sendErr) {
              console.error("Parent WhatsApp send error:", sendErr?.message ?? sendErr);
            }
          } else {
            if (!isElite) console.log(`Skipping parent notify: user ${row.user_id} not in Elite/Elite+ (plan=${userRow.plan}).`);
            if (!phone) console.log(`Skipping parent notify: no parent_phone for user ${row.user_id}.`);
            if (!verified) console.log(`Skipping parent notify: parent not verified for user ${row.user_id}.`);
          }
        }
      } catch (pnErr) {
        console.warn("Parent notify inner error (ignored):", pnErr?.message ?? pnErr);
      }

      // 3) Mark row as 'notified' so we don't re-send repeatedly, add notified_at timestamp
      try {
        const { error: updErr } = await sb
          .from("scheduled_tests")
          .update({
            status: "notified",
            notified_at: isoNow(),
            updated_at: isoNow()
          })
          .eq("id", row.id);
        if (updErr) console.warn("Failed to update scheduled_test status for", row.id, updErr.message);
      } catch (uErr) {
        console.warn("Failed to set notified status (ignored):", uErr?.message ?? uErr);
      }

    } catch (err) {
      console.error("Error processing scheduled_test", row.id, err?.message ?? err);
    }
  }

  return dueRows;
}
}

//
// main
async function main() {
  try {
    console.log("Scheduler started at", isoNow());
    const due = await fetchDueSchedules();
    if (!due || due.length === 0) {
      console.log("No schedules due.");
    } else {
      console.log("Found schedules due:", due.length);

      for (const schedule of due) {
        const userId = schedule.user_id;
        console.log("Processing schedule", schedule.id, "user", userId);

        const uploads = await getRecentUploadsForUser(userId, 5);
        const prompt = buildPromptFromUploads(uploads);

        try {
          const test = await generateTestWithOpenAI(prompt, 5, "MCQ");
          console.log("Generated test items:", Array.isArray(test) ? test.length : "not array");

          const scheduledTestId = await insertScheduledTest(schedule, userId, test);
          console.log("Inserted scheduled_test id:", scheduledTestId);

          await markScheduleRun(schedule.id);

          // send reminder if Twilio is configured
          await sendWhatsappReminder(userId, scheduledTestId, test);
        } catch (err) {
          console.error("Failed to generate/insert/send for schedule", schedule.id, err?.message ?? err);
        }
      }
    }

    // also process already-created pending scheduled_tests (send user + parent reminders)
    const processed = await fetchDueScheduledTestsAndNotify();
    if (processed && processed.length) {
      console.log("Processed existing pending scheduled_tests:", processed.length);
    } else {
      console.log("No existing pending scheduled_tests to process.");
    }

    console.log("Scheduler finished at", isoNow());
  } catch (err) {
    console.error("Scheduler main error:", err);
  }
}

main().catch((e) => {
  console.error("Unhandled error in scheduler:", e);
  process.exit(1);
});