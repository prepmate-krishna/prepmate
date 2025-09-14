// pages/api/analyze-report.js
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

/**
 * Analyze a saved report using OpenAI and store ai_explanations & weak_topics back in Supabase.
 *
 * Expects POST body: { reportId: "<uuid>" }  OR  { testId: "<uuid>" }
 *
 * IMPORTANT: keep OPENAI_API_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local (server only).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openAiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}
if (!openAiKey) {
  console.error("Missing OPENAI_API_KEY in env.");
}

const sb = createClient(supabaseUrl, supabaseServiceKey);
const client = new OpenAI({ apiKey: openAiKey });

// Remove markdown fences and surrounding text
function extractJsonLike(text = "") {
  if (!text) return null;
  // remove triple-backtick and single-backtick fences
  let cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  // attempt to find top-level object
  const objMatch = cleaned.match(/(\{[\s\S]*\})/m);
  if (objMatch) cleaned = objMatch[1];
  return cleaned;
}

// Safely parse JSON with fallback
function tryParseJson(txt) {
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch (e) {
    // try looser extraction (e.g., model wrapped in text)
    const maybe = extractJsonLike(txt);
    if (!maybe) return null;
    try {
      return JSON.parse(maybe);
    } catch (e2) {
      return null;
    }
  }
}

// Turn a question object into a short human-friendly string
function questionToText(q, idx) {
  try {
    if (!q) return `Q${idx + 1}`;
    const options = q.options && Array.isArray(q.options) ? ` Options: ${q.options.join(" | ")}` : "";
    return `${idx + 1}. ${q.question}${options} (Answer: ${q.answer ?? "N/A"})`;
  } catch {
    return `${idx + 1}. ${q.question ?? "Question"}`;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { reportId, testId } = req.body ?? {};
    if (!reportId && !testId) return res.status(400).json({ success: false, error: "Missing reportId or testId" });

    // Fetch report + linked test (try by reportId first)
    let fetchQ;
    if (reportId) {
      fetchQ = sb.from("reports").select("*, test:tests(*)").eq("id", reportId).limit(1);
    } else {
      fetchQ = sb.from("reports").select("*, test:tests(*)").eq("test_id", testId).limit(1);
    }

    const { data: rows, error: fetchErr } = await fetchQ;
    if (fetchErr) {
      console.error("Failed fetching report:", fetchErr);
      return res.status(500).json({ success: false, error: "Failed to fetch report" });
    }
    const row = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!row) return res.status(404).json({ success: false, error: "Report not found" });

    // Try to get test questions from linked test record or JSON fields
    let test = row.test ?? null;
    if (!test) {
      // Some code paths stored raw test JSON in a field (e.g., test_json or report_json)
      test = row.test_json ?? row.report_json ?? null;
    }

    if (!test || !(Array.isArray(test.questions) || Array.isArray(test.question_list) || Array.isArray(test.questionList))) {
      // fallback: if entire report row contains fields that look like questions, try to parse
      // but in most flows, tests are stored in tests table and linked via test_id
      console.error("Test questions not found on report row. Row content keys:", Object.keys(row));
      return res.status(400).json({ success: false, error: "Linked test data not found for analysis" });
    }

    // Normalize questions array
    const questions = Array.isArray(test.questions) ? test.questions
      : (Array.isArray(test.question_list) ? test.question_list : (Array.isArray(test.questionList) ? test.questionList : []));

    // Determine which questions were wrong using report row fields
    // Some schemas store answers in report JSON — try to find user's answers and the correct answers.
    // We'll create an array of objects { index, question, correct, userAnswer, isCorrect }
    const userReport = row; // alias
    let answerMap = null;
    if (userReport && userReport.report_json && Array.isArray(userReport.report_json.answers)) {
      // if your saved report stored answers as array
      answerMap = userReport.report_json.answers;
    } else if (userReport && userReport.raw_answers && Array.isArray(userReport.raw_answers)) {
      answerMap = userReport.raw_answers;
    } else if (userReport && userReport.ai_explanations && Array.isArray(userReport.ai_explanations)) {
      // nothing, just fallback
      answerMap = null;
    }
    // Build a list of wrong indexes from 'wrong' count and possible detail in report_json
    const wrongIndexes = new Set();
    // If report has saved per-question correctness inside report_json.questions array, use it
    if (userReport?.report_json?.questions && Array.isArray(userReport.report_json.questions)) {
      userReport.report_json.questions.forEach((q, idx) => {
        if (q.userAnswer !== undefined && q.answer !== undefined) {
          const userAns = String(q.userAnswer).trim();
          const correct = String(q.answer).trim();
          if (userAns === "" || userAns.toLowerCase() !== correct.toLowerCase()) wrongIndexes.add(idx);
        }
      });
    }

    // If we couldn't find per-question answers, infer from counts but we still ask model to analyze all and focus on likely weak topics.
    // Prepare prompt content
    const questionSummaries = questions.map((q, i) => questionToText(q, i)).join("\n");

    // Strong prompt asking for exact JSON only
    const prompt = `
You are an expert exam tutor. I will give you a list of questions (with options if MCQ) and the correct answer for each.
You must return VALID JSON ONLY — no commentary, no markdown fences, no extra text.

Output must be a JSON object with exactly these keys:
{
  "explanations": [ { "index": <int>, "explanation": "<1-3 sentence step-by-step explanation>", "references": ["<optional reference url or short name>"] }, ... ],
  "weak_topics": ["<Topic1>", "<Topic2>", ...]  // at most 3 topics, highest priority first
}

Rules:
- Provide explanations only for questions that the student likely got wrong (based on the report). If you do not know which ones were wrong, provide short explanations for the top 3 most diagnostic/wrong-prone questions and list weak_topics based on common student errors.
- Explanations must be short and actionable (one to three brief steps).
- weak_topics must be concise topic names (e.g., "Trigonometry", "Quadratic Equations", "Cell Structure").
- Do not include any extra keys or text. Only return the JSON object.

Questions (each line shows question index + content):
${questionSummaries}

If there are clues in the saved report (counts: attempted/wrong/correct), use them. Otherwise, analyze the questions and prioritize common weak topics.

IMPORTANT: Output valid JSON ONLY.
`;

    // Call OpenAI - low temperature, constrained tokens
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.0
    });

    const raw = completion?.choices?.[0]?.message?.content ?? "";
    const cleaned = extractJsonLike(String(raw));

    let parsed = tryParseJson(cleaned);
    if (!parsed) {
      // final fallback: try direct parse of raw
      parsed = tryParseJson(raw);
    }

    if (!parsed) {
      // Save raw model output into logs and return error details for debugging
      console.error("AI output not parseable as JSON. Raw output:", raw);
      return res.status(500).json({ success: false, error: "AI did not return valid JSON", raw: raw });
    }

    // Validate shape
    const explanations = Array.isArray(parsed.explanations) ? parsed.explanations.map((e) => {
      // sanitize fields
      return {
        index: Number(e.index),
        explanation: typeof e.explanation === "string" ? e.explanation.trim() : String(e.explanation || ""),
        references: Array.isArray(e.references) ? e.references : (e.references ? [String(e.references)] : [])
      };
    }) : [];

    const weak_topics = Array.isArray(parsed.weak_topics) ? parsed.weak_topics : (Array.isArray(parsed.weakTopics) ? parsed.weakTopics : []);

    // Persist back to reports table
    const updatePayload = {
      ai_explanations: explanations,
      weak_topics: weak_topics
    };

    const { data: upd, error: updErr } = await sb
      .from("reports")
      .update(updatePayload)
      .eq("id", row.id)
      .select()
      .limit(1);

    if (updErr) {
      console.error("Failed to update report with AI analysis:", updErr);
      return res.status(500).json({ success: false, error: "Failed to save AI analysis" });
    }

    // Success — return parsed AI output and saved row
    return res.status(200).json({ success: true, ai: parsed, updated: upd?.[0] ?? null });
  } catch (err) {
    console.error("analyze-report exception:", err);
    return res.status(500).json({ success: false, error: String(err) });
  }
}
