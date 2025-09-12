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
  // fetch some metadata about uploads. If created_at doesn't exist this may return error.
  const { data, error } = await sb
    .from("uploads")
    .select("id, filename, path, bucket, mime, size, created_at")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // return empty array if uploads table has different schema
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

  // Try parse; fallback to extract first array
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
    // Optionally log to reminder_logs table
    const { error } = await sb.from("reminder_logs").insert([{
      scheduled_test_id: scheduledTestId,
      user_id,
      channel: "whatsapp",
      message,
      success: true,
      meta: { sent_at: isoNow() },
    }]);
    if (error) console.warn("Failed to insert reminder log:", error.message);
  } catch (err) {
    console.error("❌ Failed to send WhatsApp message:", err?.message ?? err);
    // log failure
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
// main
async function main() {
  try {
    console.log("Scheduler started at", isoNow());
    const due = await fetchDueSchedules();
    if (!due || due.length === 0) {
      console.log("No schedules due.");
      return;
    }
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

    console.log("Scheduler finished at", isoNow());
  } catch (err) {
    console.error("Scheduler main error:", err);
  }
}

main().catch((e) => {
  console.error("Unhandled error in scheduler:", e);
  process.exit(1);
});
