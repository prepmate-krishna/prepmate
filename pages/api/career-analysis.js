/*
  pages/api/career-analysis.js
  Server-side only API that accepts POST { name, answers } and returns a career report.
  Safe fallback if OPENAI_API_KEY is missing.
*/
import OpenAI from "openai";

const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const client = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

export const config = { api: { bodyParser: true } };

function sampleReportFor(name) {
  return `🧾 Final Career Report for ${name}

1. Core Profile
- Curious, analytical and product-minded.
- Comfortable with technology and practical problem solving.
- Prefers structured learning and incremental projects.
- Pragmatic about resources and focused on high-ROI learning.

2. Key Drivers
- Motivated by growth, practical outcomes and career stability.
- Values skills that convert quickly to employability.
- Prefers flexibility and learning that can be done online.

3. Future-Proof Career Clusters (2025–2035)
🔥 Primary Tracks
- AI Product Manager
- Data Scientist (FinTech)
- Machine Learning Engineer

⚡ Secondary Roles
- Business Analyst (AI/FinTech)
- Blockchain/DeFi researcher

4. Skill Roadmap
Now (0–2 years)
- Learn Python, data libraries. Build small projects.
Mid-Term (3–5 years)
- Gain experience in industry projects, certifications.
Long-Term (5–10 years)
- Move to leadership/scale a product or startup.

5. Summary in One Line
${name} is well-suited to build a future at the intersection of AI and finance by focusing on practical projects and high-ROI learning.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, answers } = req.body || {};
    if (!name || !answers) {
      return res.status(400).json({ error: "Missing name or answers", received: req.body ?? null });
    }

    // If OpenAI key missing, return deterministic sample for UI flow
    if (!client) {
      const report = sampleReportFor(String(name).trim());
      return res.status(200).json({ ok: true, report, fallback: true });
    }

    const prompt = `
You are an expert career counselor. Given the user's name and answers, produce a full human-readable career report.
Return plain text only (no JSON wrapper).
Name: ${name}
Answers: ${JSON.stringify(answers, null, 2)}

Structure:
1. Core Profile (6 lines)
2. Key Drivers (3-5 bullets)
3. Future-Proof Career Clusters (2025–2035) - Primary Tracks (3), Secondary Roles (2)
4. Skill Roadmap - Now (0–2 years), Mid-Term (3–5), Long-Term (5–10)
5. Summary in One Line
`;

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a senior career counselor and roadmap architect." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1200,
    });

    const report = resp?.choices?.[0]?.message?.content?.trim() ?? sampleReportFor(String(name).trim());
    return res.status(200).json({ ok: true, report });
  } catch (err) {
    console.error("career-analysis error:", err);
    const fallback = sampleReportFor(String((req.body && req.body.name) || "Student"));
    return res.status(200).json({ ok: true, report: fallback, fallback: true, error: String(err?.message ?? err) });
  }
}
