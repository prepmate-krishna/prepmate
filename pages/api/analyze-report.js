// pages/api/analyze-report.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function cleanJson(raw = "") {
  try {
    // strip code fences
    let txt = raw.replace(/```(?:json)?\s*([\s\S]*?)```/gi, "$1").trim();
    return JSON.parse(txt);
  } catch (e) {
    console.error("JSON parse fail:", e.message, "Raw:", raw);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { wrongQuestions } = req.body ?? {};
  if (!wrongQuestions || wrongQuestions.length === 0) {
    return res.status(200).json({ weakTopics: [], explanations: [] });
  }

  const prompt = `
Analyze the student's incorrect answers.

For each missed question:
1. Give a short step-by-step explanation.
2. Add 1–2 reference keywords.

Also list up to 5 weak topic names.

Output JSON only:
{
  "weakTopics":["topic1","topic2"],
  "explanations":[
    {"index":0,"question":"...","explanation":"...","references":["...","..."]}
  ]
}

Input:
${wrongQuestions.map((w, i) => `Q${i + 1}: ${w.question}\nUser: ${w.userAns}\nCorrect: ${w.correct ?? "N/A"}`).join("\n")}
`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 600,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    const parsed = cleanJson(raw);

    if (!parsed) {
      return res.status(200).json({ weakTopics: [], explanations: [], parseError: true, raw });
    }

    return res.status(200).json({
      weakTopics: parsed.weakTopics ?? [],
      explanations: parsed.explanations ?? [],
    });
  } catch (err) {
    console.error("AI analysis error:", err);
    return res.status(500).json({ error: "AI analysis failed", details: err.message });
  }
}
