// pages/generate.js
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function GenerateTest() {
  const [text, setText] = useState("");
  const [usePdf, setUsePdf] = useState(false);
  const [pdfFileName, setPdfFileName] = useState("");
  const [type, setType] = useState("MCQ");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  // Upload PDF -> call /api/extract-pdf which returns { text }
  const handlePdfUpload = async (file) => {
    if (!file) return;
    setError("");
    setPdfFileName(file.name);
    setLoading(true);
    try {
      const res = await fetch("/api/extract-pdf", {
        method: "POST",
        body: file, // raw binary; server handler reads stream
      });
      const data = await res.json();
      if (data?.text) {
        setText(data.text);
      } else {
        setError(data?.error || "Failed to extract text from PDF");
      }
    } catch (err) {
      setError(err.message || "PDF upload failed");
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    setError("");
    setQuestions([]);
    setAnswers({});
    setReport(null);

    if (!text || text.trim().length < 20) {
      setError("Please upload a PDF or paste at least some text (min 20 chars).");
      return;
    }
    if (count < 2 || count > 20) {
      setError("Question count must be between 2 and 20.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, type, count }),
      });
      const data = await res.json();
      if (data?.questions) {
        setQuestions(data.questions);
      } else if (data?.parseError) {
        setError("AI returned unparsable output. Check console for raw response.");
        console.warn("AI raw:", data.raw, "extracted:", data.extracted);
      } else {
        setError(data?.error || "Generation failed");
      }
    } catch (err) {
      setError(err.message || "Network error while generating test");
    }
    setLoading(false);
  };

  const chooseOption = (qIdx, optionValue) => {
    setAnswers((s) => ({ ...s, [qIdx]: optionValue }));
  };

  const typeAnswer = (qIdx, textValue) => {
    setAnswers((s) => ({ ...s, [qIdx]: textValue }));
  };

  // --- Here is the full submitTest function (complete and integrated) ---
  const submitTest = async () => {
    setReport(null);
    setError("");

    if (!questions || questions.length === 0) {
      setError("No test loaded.");
      return;
    }

    // --- Local scoring ---
    const total = questions.length;
    let attempted = 0;
    let attemptedCorrect = 0;
    let attemptedWrong = 0;
    const wrongQuestions = [];

    questions.forEach((q, i) => {
      const userAns = answers[i];
      if (!userAns || String(userAns).trim() === "") return;

      attempted++;
      if (q.options && Array.isArray(q.options) && q.options.length > 0) {
        // MCQ case
        const correctRaw = String(q.answer || "").trim();
        const normalizedUser = String(userAns).trim();

        let isCorrect = false;
        if (/^[A-D]$/i.test(correctRaw)) {
          const letterOfUser = /^[A-D]$/i.test(normalizedUser)
            ? normalizedUser.toUpperCase()
            : (() => {
                const idx = q.options.findIndex((opt) => String(opt).trim() === normalizedUser);
                return idx >= 0 ? String.fromCharCode(65 + idx) : null;
              })();
          if (letterOfUser && letterOfUser.toUpperCase() === correctRaw.toUpperCase()) isCorrect = true;
        } else {
          if (normalizedUser.toLowerCase() === correctRaw.toLowerCase()) isCorrect = true;
        }

        if (isCorrect) attemptedCorrect++;
        else {
          attemptedWrong++;
          wrongQuestions.push({ index: i, question: q.question, userAns: normalizedUser, correct: q.answer, options: q.options });
        }
      } else {
        // Q&A open-ended → mark as wrong for now, send to AI for grading/explanation
        attemptedWrong++;
        wrongQuestions.push({ index: i, question: q.question, userAns: String(userAns), correct: q.answer ?? null, options: null });
      }
    });

    const localReport = { totalQuestions: total, attempted, attemptedCorrect, attemptedWrong };
    setReport({ local: localReport, ai: null, status: "Analyzing..." });

    // --- AI analysis ---
    let analysis = null;
    try {
      const resp = await fetch("/api/analyze-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, userAnswers: answers, wrongQuestions }),
      });
      analysis = await resp.json();
    } catch (err) {
      setReport({ local: localReport, ai: null, status: "AI analysis failed: " + (err.message || err) });
      return;
    }

    const weakTopics = analysis?.weakTopics ?? [];
    const explanations = analysis?.explanations ?? [];

    // show immediate result
    setReport({ local: localReport, ai: { weakTopics, explanations }, status: "Done" });

    // --- Save to DB ---
    try {
      // Get Supabase user id directly client-side
      const { data: userData } = await supabase.auth.getUser();
      const supabaseUserId = userData?.user?.id ?? null;

      if (!supabaseUserId) {
        console.warn("Not logged in, skipping save");
        return;
      }

      const payload = {
        supabaseUserId,
        test: {
          type,
          num_questions: questions.length,
          questions,
        },
        report: {
          totalQuestions: localReport.totalQuestions,
          attempted: localReport.attempted,
          attemptedCorrect: localReport.attemptedCorrect,
          attemptedWrong: localReport.attemptedWrong,
          weakTopics,
          explanations,
        },
      };

      const saveResp = await fetch("/api/save-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saveJson = await saveResp.json();
      if (!saveJson?.success) {
        console.warn("Save report failed:", saveJson);
        setReport((r) => ({ ...r, saveStatus: "⚠️ Failed to save report" }));
      } else {
        setReport((r) => ({ ...r, saveStatus: "✅ Report saved" }));
      }
    } catch (err) {
      console.error("Save report error:", err);
      setReport((r) => ({ ...r, saveStatus: "⚠️ Save failed" }));
    }
  };
  // --- end submitTest ---

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <h1>AI Test Generator</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={usePdf} onChange={(e) => { setUsePdf(e.target.checked); setText(""); setPdfFileName(""); }} />
          Use PDF upload
        </label>

        <div>
          <label>Type: </label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="MCQ">MCQ</option>
            <option value="Q&A">Q&A</option>
            <option value="Mixed">Mixed</option>
          </select>
        </div>

        <div>
          <label>Questions: </label>
          <input type="number" min="2" max="20" value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: 70 }} />
        </div>

        <div>
          <button onClick={handleGenerate} disabled={loading} style={{ padding: "8px 12px" }}>
            {loading ? "Generating..." : "Generate Test"}
          </button>
        </div>
      </div>

      {/* PDF upload OR manual text */}
      {usePdf ? (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Upload PDF notes (best):</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePdfUpload(f);
            }}
          />
          <div style={{ marginTop: 8, color: "#555" }}>{pdfFileName ? `Loaded: ${pdfFileName}` : "No file selected"}</div>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Or paste notes (plain text):</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ width: "100%", minHeight: 120 }} />
        </div>
      )}

      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

      {/* Test UI when generated */}
      {questions.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h2>Take the Test</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitTest();
            }}
          >
            {questions.map((q, i) => (
              <div key={i} style={{ padding: 12, border: "1px solid #eee", borderRadius: 6, marginBottom: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <strong>Q{i + 1}.</strong> {q.question}
                </div>

                {q.options && Array.isArray(q.options) && q.options.length > 0 ? (
                  <div>
                    {q.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      // store as letter if answer is letter; else store option text
                      const optionValue = /^[A-D]$/i.test(String(q.answer || "")) ? letter : opt;
                      return (
                        <label key={idx} style={{ display: "block", marginBottom: 6 }}>
                          <input
                            type="radio"
                            name={`q-${i}`}
                            value={optionValue}
                            checked={String(answers[i] || "") === String(optionValue)}
                            onChange={(e) => chooseOption(i, e.target.value)}
                            style={{ marginRight: 8 }}
                          />
                          <strong style={{ marginRight: 8 }}>{letter}.</strong> {opt}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    <textarea
                      placeholder="Type your answer..."
                      value={answers[i] || ""}
                      onChange={(e) => typeAnswer(i, e.target.value)}
                      style={{ width: "100%", minHeight: 64 }}
                    />
                  </div>
                )}
              </div>
            ))}

            <div style={{ display: "flex", gap: 12 }}>
              <button type="submit" style={{ padding: "10px 14px" }}>
                Submit Test
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuestions([]);
                  setAnswers({});
                  setReport(null);
                }}
                style={{ padding: "10px 14px" }}
              >
                Clear
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Report */}
      {report && (
        <div style={{ marginTop: 22 }}>
          <h2>AI-Generated Report</h2>

          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 6, background: "#fff" }}>
            <div>
              <strong>Total questions:</strong> {report.local.totalQuestions}
            </div>
            <div>
              <strong>Attempted:</strong> {report.local.attempted}
            </div>
            <div>
              <strong>Attempted Correct:</strong> {report.local.attemptedCorrect}
            </div>
            <div>
              <strong>Attempted Wrong:</strong> {report.local.attemptedWrong}
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>Weak topics (AI):</strong>
              <div>{report.ai?.weakTopics && report.ai.weakTopics.length ? report.ai.weakTopics.join(", ") : "—"}</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>AI Explanations:</strong>
              {report.ai?.explanations && report.ai.explanations.length ? (
                <div>
                  {report.ai.explanations.map((ex, idx) => (
                    <div key={idx} style={{ marginBottom: 10 }}>
                      <div>
                        <strong>Q{ex.index + 1}:</strong> {ex.question}
                      </div>
                      <div>
                        <em>Explanation:</em> {ex.explanation}
                      </div>
                      {ex.references && ex.references.length > 0 && (
                        <div style={{ fontSize: 13, color: "#444" }}>
                          <strong>Refs:</strong> {ex.references.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div>AI analysis pending or not available.</div>
              )}
            </div>

            {report.saveStatus && <div style={{ marginTop: 12, fontWeight: 600 }}>{report.saveStatus}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
