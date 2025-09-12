// pages/take-scheduled/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

/**
 * Page: /take-scheduled/[id]
 * - Fetches the scheduled test via server API /api/get-scheduled-test
 * - Verifies the logged-in supabase user's ext_id matches ownership
 * - Renders questions (MCQ list or open Q&A)
 * - On submit: computes local score, calls /api/analyze-report, then calls /api/save-report
 *
 * Note: this page expects the API /api/get-scheduled-test and /api/analyze-report and /api/save-report to exist (we created them).
 */

export default function TakeScheduledTest() {
  const router = useRouter();
  const { id } = router.query; // scheduledTestId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [test, setTest] = useState(null); // array of questions
  const [meta, setMeta] = useState(null);
  const [answers, setAnswers] = useState({});
  const [status, setStatus] = useState(""); // analysis / save messages
  const [userExtId, setUserExtId] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError("");

      // 1) get current supabase user ext_id
      try {
        const { data } = await supabase.auth.getUser();
        const ext = data?.user?.id ?? null;
        if (!ext) {
          setError("Not signed in. Please sign in to access this test.");
          setLoading(false);
          return;
        }
        setUserExtId(ext);

        // 2) call server API to fetch scheduled test securely
        const resp = await fetch("/api/get-scheduled-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledTestId: id, supabaseUserId: ext }),
        });
        const body = await resp.json();
        if (!resp.ok) {
          setError(body?.error || JSON.stringify(body));
          setLoading(false);
          return;
        }
        if (!body?.test) {
          setError("Scheduled test not found or not available.");
          setLoading(false);
          return;
        }

        setTest(body.test);
        setMeta(body.metadata ?? null);

      } catch (e) {
        console.error("Fetch scheduled test failed:", e);
        setError("Failed to fetch scheduled test.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // handlers for answers
  const chooseOption = (qIdx, optionValue) => {
    setAnswers((s) => ({ ...s, [qIdx]: optionValue }));
  };
  const typeAnswer = (qIdx, textValue) => {
    setAnswers((s) => ({ ...s, [qIdx]: textValue }));
  };

  // submit handler: compute local score, call analyze-report and save-report
  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!test || test.length === 0) {
      setError("No test loaded.");
      return;
    }
    setError("");
    setStatus("Scoring locally...");

    // local scoring
    const total = test.length;
    let attempted = 0, attemptedCorrect = 0, attemptedWrong = 0;
    const wrongQuestions = [];

    test.forEach((q, i) => {
      const userAns = answers[i];
      if (!userAns || String(userAns).trim() === "") return;
      attempted++;
      if (q.options && Array.isArray(q.options) && q.options.length > 0) {
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
        attemptedWrong++;
        wrongQuestions.push({ index: i, question: q.question, userAns: String(userAns), correct: q.answer ?? null, options: null });
      }
    });

    const localReport = { totalQuestions: total, attempted, attemptedCorrect, attemptedWrong };
    setStatus("Requesting AI analysis...");

    // call AI analyze endpoint
    let analysis = null;
    try {
      const aResp = await fetch("/api/analyze-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: test, userAnswers: answers, wrongQuestions }),
      });
      analysis = await aResp.json();
    } catch (err) {
      console.error("AI analysis error:", err);
      setStatus("AI analysis failed.");
      analysis = { weakTopics: [], explanations: [] };
    }

    const weakTopics = analysis?.weakTopics ?? [];
    const explanations = analysis?.explanations ?? [];

    setStatus("Saving report...");
    // save via server save-report
    try {
      // get supabase client-side user id
      const { data } = await supabase.auth.getUser();
      const supabaseUserId = data?.user?.id ?? null;
      if (!supabaseUserId) {
        setStatus("Not signed in; cannot save.");
        return;
      }

      const payload = {
        supabaseUserId,
        test: {
          type: "scheduled",
          num_questions: test.length,
          questions: test,
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
        console.warn("Save failed:", saveJson);
        setStatus("⚠️ Save failed");
      } else {
        setStatus("✅ Report saved");
      }
    } catch (err) {
      console.error("Save error:", err);
      setStatus("⚠️ Save failed");
    }
  };

  // UI
  if (loading) return <div style={{ padding: 24 }}>Loading scheduled test...</div>;
  if (error) return <div style={{ padding: 24, color: "crimson" }}>Error: {error}</div>;
  if (!test) return <div style={{ padding: 24 }}>No test available.</div>;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <h1>Scheduled Test</h1>
      {meta && (
        <div style={{ marginBottom: 12 }}>
          <div><strong>Test ID:</strong> {meta.scheduledTestId}</div>
          <div><strong>Status:</strong> {meta.status}</div>
          <div><strong>Created:</strong> {new Date(meta.created_at).toLocaleString()}</div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {test.map((q, i) => (
          <div key={i} style={{ padding: 12, border: "1px solid #eee", borderRadius: 6, marginBottom: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Q{i + 1}.</strong> {q.question}
            </div>

            {q.options && Array.isArray(q.options) && q.options.length > 0 ? (
              <div>
                {q.options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
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
          <button type="submit" style={{ padding: "10px 14px" }}>Submit Test</button>
          <button type="button" onClick={() => { setAnswers({}); setStatus(""); }} style={{ padding: "10px 14px" }}>Reset</button>
        </div>
      </form>

      <div style={{ marginTop: 18 }}>
        <strong>Status:</strong> {status || "Not submitted yet"}
      </div>
    </div>
  );
}
