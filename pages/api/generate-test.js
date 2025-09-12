// pages/api/generate-test.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper: strip markdown code fences and whitespace
function stripMarkdownBlocks(text = "") {
  // remove triple-backtick blocks (```json ... ```), leaving inner content
  text = text.replace(/```(?:json)?\s*([\s\S]*?)```/gi, "$1");
  // also remove single backticks
  text = text.replace(/`([^`]+)`/g, "$1");
  return text.trim();
}

// Helper: try to find the first JSON array/object substring in text
function extractFirstJson(text = "") {
  const cleaned = stripMarkdownBlocks(text);

  // try to find the first top-level JSON array "[ ... ]"
  const arrayMatch = cleaned.match(/(\[[\s\S]*\])/m);
  if (arrayMatch) return arrayMatch[1];

  // else try first top-level object "{ ... }"
  const objMatch = cleaned.match(/(\{[\s\S]*\})/m);
  if (objMatch) return objMatch[1];

  // fallback: no obvious JSON
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, type, count } = req.body ?? {};
  if (!text || !type || !count) {
    return res.status(400).json({ error: "Missing fields. Required: text, type, count" });
  }

  // Safe prompt (no raw triple-backticks inside the template string)
  const prompt = `
You are an exam-prep assistant. Generate exactly ${count} ${type} questions from the study notes below.
Respond as a JSON array only.

If type = "MCQ", generate only multiple-choice questions in format:
{ "question":"...", "options":["A","B","C","D"], "answer":"A" }

If type = "Q&A", generate only open-ended Q&A:
{ "question":"...", "answer":"..." }

If type = "Mixed", generate a mix of both.

Study notes:
"""${text}"""

IMPORTANT: Output JSON only. If you wrap the JSON in a JSON code fence or markdown, that's okay, but do not include any commentary or explanation outside the JSON.
`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.2,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    const jsonText = extractFirstJson(raw);

    if (!jsonText) {
      // can't find JSON — return raw for debugging
      return res.status(200).json({
        questions: null,
        parseError: true,
        raw: raw,
        message: "Could not find JSON in model response. See raw.",
      });
    }

    try {
      const parsed = JSON.parse(jsonText);
      // ensure it's an array (normalize)
      const questions = Array.isArray(parsed) ? parsed : [parsed];
      return res.status(200).json({ questions });
    } catch (err) {
      // parsing failed despite extraction; return helpful debug info
      return res.status(200).json({
        questions: null,
        parseError: true,
        raw: raw,
        extracted: jsonText,
        parseErrorMessage: err.message,
      });
    }
  } catch (err) {
    console.error("AI generation error:", err);
    return res.status(500).json({ error: "Failed to generate test", details: err?.message || String(err) });
  }
}
