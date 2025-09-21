// pages/career-counseling.js
import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";

/*
  Full career-counseling page with all sections/questions (27 Qs).
  - Multi-select checkboxes allowed (user may select 1..n options per question).
  - Validation: every question must have at least one selected option.
  - On submit: POSTs { name, answers } to /api/career-analysis
  - On success: saves report to sessionStorage and routes to /career-report
*/

const PALETTE = {
  bg: "#0b0b0c",
  card: "#0f1720",
  text: "#dff6f1",
  muted: "#94a3b8",
  accent: "#40E0D0", // Tiffany green
  danger: "#ff6b6b",
};

const SECTIONS = [
  {
    id: "section1",
    title: "Section 1 — Interests & Passions",
    questions: [
      {
        id: "s1q1",
        text: "Which activity excites you the most?",
        options: [
          "A) Teaching or mentoring others",
          "B) Solving logical puzzles/coding",
          "C) Designing/creating new things",
          "D) Leading or influencing people",
        ],
      },
      {
        id: "s1q2",
        text: "You enjoy working most with:",
        options: ["A) People", "B) Data", "C) Technology", "D) Ideas/Concepts"],
      },
      {
        id: "s1q3",
        text: "If money didn’t matter, what would you spend most of your time doing?",
        options: ["A) Inventing/building", "B) Helping others improve", "C) Creating art/design/content", "D) Analyzing systems/numbers"],
      },
      {
        id: "s1q4",
        text: "Do you prefer creating something new or improving something existing?",
        options: ["A) Creating new things", "B) Improving/refining existing ones"],
      },
      {
        id: "s1q5",
        text: "Which of these problems would you most like to solve?",
        options: [
          "A) Health & medicine",
          "B) Climate & sustainability",
          "C) Digital technology & AI",
          "D) Finance & economy",
          "E) Education & people development",
        ],
      },
    ],
  },
  {
    id: "section2",
    title: "Section 2 — Cognitive Strengths",
    questions: [
      {
        id: "s2q1",
        text: "Which comes easiest to you?",
        options: [
          "A) Spotting patterns & logic",
          "B) Expressing creativity (art, writing, design)",
          "C) Fixing real-world problems hands-on",
          "D) Organizing people and resources",
        ],
      },
      {
        id: "s2q2",
        text: "How comfortable are you learning new digital tools/software?",
        options: ["A) Very comfortable (I enjoy it)", "B) Neutral", "C) Uncomfortable"],
      },
      {
        id: "s2q3",
        text: "Can you focus on a single, complex task for hours?",
        options: ["A) Yes, I love deep work", "B) Sometimes, if I enjoy it", "C) No, I prefer variety"],
      },
      {
        id: "s2q4",
        text: "Which describes you best?",
        options: ["A) Analytical & logical", "B) Imaginative & creative", "C) Practical & action-oriented", "D) Organized & leadership-driven"],
      },
    ],
  },
  {
    id: "section3",
    title: "Section 3 — Personality & Work Style",
    questions: [
      {
        id: "s3q1",
        text: "Do you prefer:",
        options: ["A) Structured systems & clear rules", "B) Flexible, unstructured environments"],
      },
      {
        id: "s3q2",
        text: "Do you work better:",
        options: ["A) Alone, independently", "B) In teams, collaboratively"],
      },
      {
        id: "s3q3",
        text: "How do you handle deadlines?",
        options: ["A) Thrive under pressure", "B) Prefer steady pace without stress"],
      },
      {
        id: "s3q4",
        text: "Do you like experimenting & risk-taking?",
        options: ["A) Yes, I enjoy risks", "B) Sometimes, if calculated", "C) No, I prefer stability"],
      },
      {
        id: "s3q5",
        text: "What’s your ideal work pace?",
        options: ["A) Fast-changing, always new challenges", "B) Consistent & steady"],
      },
    ],
  },
  {
    id: "section4",
    title: "Section 4 — Values & Motivators",
    questions: [
      {
        id: "s4q1",
        text: "What matters most in your career?",
        options: ["A) High income", "B) Work-life balance", "C) Prestige/reputation", "D) Making a social impact"],
      },
      {
        id: "s4q2",
        text: "Would you rather:",
        options: ["A) Have a stable long-term job", "B) Take risks for high-reward opportunities"],
      },
      {
        id: "s4q3",
        text: "Which lifestyle do you prefer?",
        options: ["A) Frequent travel", "B) Hybrid (home + office)", "C) Fully remote", "D) On-site/field-based"],
      },
    ],
  },
  {
    id: "section5",
    title: "Section 5 — Future Skills & Industry Preference",
    questions: [
      {
        id: "s5q1",
        text: "Does the idea of AI & automation excite or scare you?",
        options: ["A) Excites me", "B) Neutral", "C) Scares me"],
      },
      {
        id: "s5q2",
        text: "Which field attracts you the most?",
        options: ["A) AI, software, robotics", "B) Health, biotech, genetics", "C) Climate, green energy, sustainability", "D) Finance, fintech, investing", "E) Media, design, AR/VR"],
      },
      {
        id: "s5q3",
        text: "Do you like continuously learning new things?",
        options: ["A) Yes, love it", "B) Sometimes", "C) Prefer stable knowledge"],
      },
      {
        id: "s5q4",
        text: "Which global problem would you want to contribute to solving?",
        options: ["A) Climate crisis", "B) Global health", "C) Automation/digital economy", "D) Education & skills gap"],
      },
      {
        id: "s5q5",
        text: "Which role feels more natural to you?",
        options: ["A) Builder (engineer, creator)", "B) Analyzer (researcher, strategist)", "C) Helper (doctor, teacher, counselor)", "D) Influencer (leader, marketer, entrepreneur)"],
      },
      {
        id: "s5q6",
        text: "Which tech trend excites you most?",
        options: ["A) Artificial Intelligence", "B) Renewable Energy", "C) Cybersecurity & Data Privacy", "D) Biotech & Genetic Engineering", "E) Metaverse, AR/VR, Creative Tech"],
      },
    ],
  },
  {
    id: "section6",
    title: "Section 6 — Practical Constraints",
    questions: [
      {
        id: "s6q1",
        text: "How far are you willing to study for your dream career?",
        options: ["A) Short-term skills (6–12 months)", "B) Bachelor’s degree", "C) Master’s degree", "D) PhD/Advanced research"],
      },
      {
        id: "s6q2",
        text: "Are you open to moving abroad for better opportunities?",
        options: ["A) Yes", "B) Maybe, depends on situation", "C) No, prefer staying local"],
      },
      {
        id: "s6q3",
        text: "When do you want to start earning?",
        options: ["A) Immediately after school/college", "B) After higher studies (3–5 years)", "C) Willing to wait long-term for bigger payoff"],
      },
      {
        id: "s6q4",
        text: "How much financial investment can you realistically make in your education?",
        options: ["A) Very limited (need low-cost options)", "B) Moderate (some family support)", "C) High (ready to invest heavily for returns)"],
      },
    ],
  },
];

export default function CareerCounselingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  // answers structure: { sectionId: { questionId: [options...] } }
  const initialAnswers = {};
  for (const s of SECTIONS) {
    initialAnswers[s.id] = {};
    for (const q of s.questions) initialAnswers[s.id][q.id] = [];
  }
  const [answers, setAnswers] = useState(initialAnswers);
  const [sending, setSending] = useState(false);
  const [errorLine, setErrorLine] = useState("");

  function toggleOption(sectionId, questionId, option) {
    setAnswers((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const arr = copy[sectionId][questionId] || [];
      const idx = arr.indexOf(option);
      if (idx === -1) arr.push(option);
      else arr.splice(idx, 1);
      copy[sectionId][questionId] = arr;
      return copy;
    });
  }

  function validateAll() {
    if (!name || !name.trim()) {
      setErrorLine("Please enter your name.");
      return false;
    }
    for (const s of SECTIONS) {
      for (const q of s.questions) {
        const val = answers[s.id][q.id];
        if (!Array.isArray(val) || val.length === 0) {
          setErrorLine("Please complete all questions. Missing: " + q.text);
          return false;
        }
      }
    }
    setErrorLine("");
    return true;
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!validateAll()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSending(true);
    setErrorLine("");

    try {
      const resp = await fetch("/api/career-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), answers }),
      });

      // parse response (if HTML returned this will throw and be caught)
      const json = await resp.json();
      if (!resp.ok) {
        setErrorLine("Server error: " + (json?.error || "Unknown"));
        setSending(false);
        return;
      }
      const report = json.report ?? "No report returned.";
      try {
        sessionStorage.setItem("prepmate_career_report", report);
        sessionStorage.setItem("prepmate_career_name", name.trim());
      } catch (e) {
        console.warn("sessionStorage error", e);
      }
      router.push("/career-report");
    } catch (err) {
      console.error("Submit error:", err);
      setErrorLine("Network or server error. Check console.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Head>
        <title>Career Counseling — PrepMate</title>
      </Head>

      <div style={{ minHeight: "100vh", background: PALETTE.bg, color: PALETTE.text, paddingBottom: 60 }}>
        <header style={{ padding: "18px 16px", borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
          <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/prepmate-logo.png" alt="logo" style={{ width: 40, height: "auto" }} />
            <h1 style={{ margin: 0, fontSize: 20, color: PALETTE.accent }}>PrepMate — Career Counseling</h1>
          </div>
        </header>

        <main style={{ maxWidth: 980, margin: "28px auto", padding: "0 16px 60px 16px" }}>
          <section style={{ background: PALETTE.card, padding: 18, borderRadius: 12, boxShadow: "0 8px 30px rgba(0,0,0,0.6)" }}>
            <h2 style={{ marginTop: 0, color: PALETTE.accent }}>Personal details</h2>
            <p style={{ color: PALETTE.muted }}>Enter your name and answer all questions (multi-select allowed).</p>

            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "#0b0f12",
                  color: PALETTE.text,
                }}
              />
            </div>

            {errorLine && (
              <div style={{ marginTop: 12, color: PALETTE.danger, fontWeight: 700 }}>{errorLine}</div>
            )}
          </section>

          {SECTIONS.map((sec) => (
            <section key={sec.id} style={{ marginTop: 18, background: PALETTE.card, padding: 18, borderRadius: 12 }}>
              <h3 style={{ marginTop: 0, color: PALETTE.accent }}>{sec.title}</h3>
              <div style={{ color: PALETTE.muted, marginBottom: 10 }}>Select one or more options per question.</div>

              {sec.questions.map((q, qi) => (
                <div key={q.id} style={{ marginTop: qi === 0 ? 0 : 12, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.01)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ fontWeight: 700 }}>{q.text}</div>
                    <div style={{ color: PALETTE.muted, fontSize: 12 }}>{/* optional meta */}</div>
                  </div>

                  <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                    {q.options.map((opt) => {
                      const checked = (answers[sec.id] && answers[sec.id][q.id] && answers[sec.id][q.id].includes(opt)) || false;
                      return (
                        <label
                          key={opt}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 10px",
                            borderRadius: 8,
                            background: checked ? "rgba(64,224,208,0.06)" : "transparent",
                            border: checked ? `1px solid ${PALETTE.accent}` : "1px solid rgba(255,255,255,0.02)",
                            cursor: "pointer",
                            color: PALETTE.text,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOption(sec.id, q.id, opt)}
                            style={{ width: 16, height: 16 }}
                          />
                          <span style={{ fontSize: 14 }}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          ))}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 22 }}>
            <button
              onClick={handleSubmit}
              disabled={sending}
              style={{
                padding: "12px 18px",
                borderRadius: 10,
                background: PALETTE.accent,
                color: "#012524",
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
              }}
            >
              {sending ? "Analyzing..." : "Submit & Analyze"}
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
