import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

/**
 * Scheduled test page — updated to prevent reset after submit
 */

export default function TakeScheduledTest() {
  const router = useRouter();
  const { id } = router.query; // scheduledTestId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [test, setTest] = useState(null);
  const [meta, setMeta] = useState(null);
  const [answers, setAnswers] = useState({});
  const [status, setStatus] = useState("");
  const [submitted, setSubmitted] = useState(false); // NEW

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await supabase.auth.getUser();
        const ext = data?.user?.id ?? null;
        if (!ext) {
          setError("Not signed in. Please sign in to access this test.");
          setLoading(false);
          return;
        }

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

  const chooseOption = (qIdx, optionValue) => {
    if (submitted) return; // prevent changing after submit
    setAnswers((s) => ({ ...s, [qIdx]: optionValue }));
  };
  const typeAnswer = (qIdx, textValue) => {
    if (submitted) return;
    setAnswers((s) => ({ ...s, [qIdx]: textValue }));
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (submitted) return; // prevent multiple submits
    if (!test || test.length === 0) {
      setError("No test loaded.");
      return;
    }
    setError("");
    setStatus("Scoring locally...");

    // simple local scoring (no AI call here)
    const total = test.length;
    let attempted = 0, attemptedCorrect = 0, attemptedWrong = 0;
    const wrongQuestions = [];

    test.forEach((q, i) => {
      const userAns = answers[i];
      if (!userAns || String(userAns).trim() === "") return;
      attempted++;
      const correctRaw = String(q.answer ?? "").trim();
      const normalizedUser = String(userAns).trim();

      if (q.options && q.options.length) {
        const letterOfUser = /^[A-D]$/i.test(normalizedUser)
          ? normalizedUser.toUpperCase()
          : (() => {
              const idx = q.options.findIndex((opt) => String(opt).trim() === normalizedUser);
              return idx >= 0 ? String.fromCharCode(65 + idx) : null;
            })();

        if (letterOfUser && letterOfUser.toUpperCase() === correctRaw.toUpperCase()) attemptedCorrect++;
        else {
          attemptedWrong++;
          wrongQuestions.push({ index: i, question: q.question, userAns: normalizedUser, correct: q.answer });
        }
      } else {
        if (normalizedUser.toLowerCase() === correctRaw.toLowerCase()) attemptedCorrect++;
        else {
          attemptedWrong++;
          wrongQuestions.push({ index: i, question: q.question, userAns: normalizedUser, correct: q.answer });
        }
      }
    });

    const localReport = { totalQuestions: total, attempted, attemptedCorrect, attemptedWrong };
    setStatus(`Finished: ${total} total, ${attempted} attempted, ${attemptedCorrect} correct, ${attemptedWrong} wrong.`);

    // mark submitted (prevents further edits/resets)
    setSubmitted(true);

    // NOTE: we do not call external analyze/save here to keep prototype fast.
    // If you want, we can call /api/analyze-report and /api/save-report next.
  };

  // Reset only allowed BEFORE submit. If user absolutely needs to reset after submit
  // we should ask confirmation and optionally delete saved report — not implemented.
  const handleReset = () => {
    if (submitted) return; // disabled after submit
    setAnswers({});
    setStatus("");
    setError("");
  };

  if (loading) return <div style={{ padding: 24 }}>Loading scheduled test…</div>;
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

      <form onSubmit={handleSubmit}>
        {test.map((q, i) => (
          <div key={i} style={{ padding: 12, border: "1px solid #eee", borderRadius: 6, marginBottom: 12 }}>
            <div style={{ marginBottom: 8 }}><strong>Q{i + 1}.</strong> {q.question}</div>

            {q.options && Array.isArray(q.options) && q.options.length > 0 ? (
              <div>
                {q.options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const optionValue = /^[A-D]$/i.test(String(q.answer || "")) ? letter : opt;
                  return (
                    <label key={idx} style={{ display: "block", marginBottom: 6, opacity: submitted ? 0.9 : 1 }}>
                      <input
                        type="radio"
                        name={`q-${i}`}
                        value={optionValue}
                        checked={String(answers[i] || "") === String(optionValue)}
                        onChange={(e) => chooseOption(i, e.target.value)}
                        style={{ marginRight: 8 }}
                        disabled={submitted}
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
                  disabled={submitted}
                />
              </div>
            )}
          </div>
        ))}

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" style={{ padding: "10px 14px" }} disabled={submitted}>Submit Test</button>
          <button type="button" onClick={handleReset} style={{ padding: "10px 14px" }} disabled={submitted}>Reset</button>
        </div>
      </form>

      <div style={{ marginTop: 18 }}><strong>Status:</strong> {status || "Not submitted yet"}</div>
      {submitted && <div style={{ marginTop: 8, color: "green" }}>Test submitted — answers locked.</div>}
    </div>
  );
}
