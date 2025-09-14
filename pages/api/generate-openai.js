// pages/api/generate-openai.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

// load .env.local (works when executed from project root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

// read key
const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
  console.warn("Warning: OPENAI_API_KEY not set. The endpoint will attempt fallback local generation.");
}

const client = new OpenAI({ apiKey: OPENAI_KEY });

// simple local fallback generator (guarantees response if OpenAI unavailable)
function localGenerate(text = "", count = 5, type = "MCQ") {
  const sentences = (text || "")
    .replace(/\n+/g, " ")
    .split(/(?<=[.?!])\s+/)
    .filter(Boolean);
  const out = [];
  const total = Math.max(2, Math.min(20, Number(count || 5)));

  function makeMCQ(s, idx) {
    const q = (s || `Generated MCQ ${idx + 1}`).slice(0, 220);
    const correct = q.split(" ").slice(-6).join(" ") || q;
    const opts = [correct, (correct + " variant").slice(0, 60), (correct + " alt").slice(0, 60), (correct + " other").slice(0, 60)];
    // shuffle
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    const letters = ["A", "B", "C", "D"];
    const ansIdx = opts.indexOf(correct);
    return { type: "MCQ", question: q, options: opts.slice(0, 4), answer: letters[Math.max(0, ansIdx)] };
  }

  function makeQNA(s, idx) {
    const q = (s || `Generated QnA ${idx + 1}`).slice(0, 240);
    const ans = q.split(" ").slice(-6).join(" ") || "Answer";
    return { type: "QNA", question: q, answer: ans };
  }

  if (type === "MCQ") {
    for (let i = 0; i < total; i++) out.push(makeMCQ(sentences[i % sentences.length], i));
  } else if (type === "QNA") {
    for (let i = 0; i < total; i++) out.push(makeQNA(sentences[i % sentences.length], i));
  } else {
    const mcqCount = Math.floor(total / 2);
    const qnaCount = total - mcqCount;
    for (let i = 0; i < mcqCount; i++) out.push(makeMCQ(sentences[i % sentences.length], i));
    for (let j = 0; j < qnaCount; j++) out.push(makeQNA(sentences[(mcqCount + j) % sentences.length], mcqCount + j));
  }
  return out;
}

// helper: clean code fences and extract JSON array
function extractJSON(text) {
  if (!text) return null;
  // try to find first JSON array in text
  const arrayMatch = text.match(/(\[[\s\S]*\])/m);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[1]);
    } catch (e) {
      // fall through to try a looser parse
    }
  }
  // remove triple-backticks and language tags, then try JSON.parse
  const cleaned = text.replace(/```(?:json|js|typescript)?/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
}

// validate and normalize one item
function normalizeItem(item) {
  if (!item || typeof item !== "object") return null;
  const type = (item.type || (item.options ? "MCQ" : "QNA") || "MCQ").toUpperCase();
  if (type === "MCQ") {
    // require question, options (array 4), answer (A-D)
    const q = String(item.question || "").trim();
    const options = Array.isArray(item.options) ? item.options.map(String) : [];
    // If options less than 4 try to fill with variants
    while (options.length < 4) options.push("Option " + (options.length + 1));
    const answerRaw = String(item.answer || "").trim().toUpperCase();
    const answer = /^[A-D]$/.test(answerRaw) ? answerRaw : "A";
    return { type: "MCQ", question: q, options: options.slice(0, 4), answer };
  } else {
    const q = String(item.question || "").trim();
    const answer = String(item.answer || "").trim();
    return { type: "QNA", question: q, answer: answer || "(answer)" };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body && Object.keys(req.body).length ? req.body : await (async () => {
      // in case Next didn't parse body, try to read raw stream
      let s = "";
      for await (const chunk of req) s += chunk.toString();
      try { return JSON.parse(s || "{}"); } catch { return {}; }
    })();

    const text = String(body.text || "").trim();
    let questionsCount = Number(body.questions || body.count || 5);
    const typeRaw = String(body.type || "MCQ").toUpperCase();
    const type = typeRaw === "QNA" || typeRaw === "MCQ" || typeRaw === "MIXED" ? typeRaw : "MCQ";

    questionsCount = Math.max(2, Math.min(20, isNaN(questionsCount) ? 5 : questionsCount));

    if (!text) {
      return res.status(400).json({ error: "Missing 'text' in request body. Provide extracted text to generate questions." });
    }

    // System + user prompt design: ask for strict JSON only, with sentences & tricky distractors
    const system = `You are PrepMate's professional exam-writer. Produce high-quality ${type === "MCQ" ? "multiple-choice" : (type === "QNA" ? "short-answer" : "a mix of MCQ and short-answer")} questions based ONLY on the provided study text. Be precise, use correct spelling and grammar, avoid odd truncations. For MCQ questions produce 4 plausible options with distractors that are *plausible* (not obvious misspellings). Do not invent facts beyond the text but synthesize from it. Output must be a single JSON array. Do NOT return any commentary or markup — only JSON. Each item must be:\n- For MCQ: { "type":"MCQ", "question":"...", "options":["optA","optB","optC","optD"], "answer":"A", "explanation":"brief explanation (optional)" }\n- For QNA: { "type":"QNA", "question":"...", "answer":"..." }\nMake sure 'answer' for MCQ is one of A,B,C,D and matches the correct option.`;

    const userPrompt = `Study text:\n\n${text}\n\nGenerate exactly ${questionsCount} items of type ${type}.`;

    // Build messages
    const messages = [
      { role: "system", content: system },
      { role: "user", content: userPrompt }
    ];

    // Attempt OpenAI call (with fallback)
    let aiRaw = null;
    let aiJson = null;

    if (OPENAI_KEY) {
      try {
        const resp = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.2,
          max_tokens: 2200
        });

        aiRaw = (resp.choices?.[0]?.message?.content) || "";
        aiJson = extractJSON(aiRaw);
      } catch (err) {
        console.error("OpenAI call failed:", err);
        aiRaw = null;
        aiJson = null;
      }
    }

    // If we got parsed JSON, normalize and return
    if (Array.isArray(aiJson) && aiJson.length > 0) {
      const normalized = aiJson.map(normalizeItem).filter(Boolean);
      // ensure exact count
      const out = normalized.slice(0, questionsCount);
      while (out.length < questionsCount) out.push(localGenerate(text, 1, type)[0]);
      return res.status(200).json({ ok: true, questions: out });
    }

    // if OpenAI didn't return usable JSON, fallback to local generator (but still try to provide any aiRaw in details)
    const fallback = localGenerate(text, questionsCount, type);
    const details = aiRaw ? { ai_raw: aiRaw.slice(0, 800) } : undefined;
    return res.status(200).json({ ok: true, questions: fallback, details });

  } catch (err) {
    console.error("generate-openai error:", err);
    return res.status(500).json({ error: "Server error generating questions", details: String(err?.message || err) });
  }
}
