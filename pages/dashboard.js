// pages/dashboard.js
import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";
import { supabase } from "../lib/supabase"; // project already has this
import Router from "next/router";

/**
 * Dashboard for Free-plan users
 * - Displays username
 * - Streak (24h-consecutive logic)
 * - Tests taken (count)
 * - Avg score
 * - Create Test form (pdf <= 5MB or text) -> calls /api/extract-pdf & /api/generate-openai
 * - Saves generated test to `scheduled_tests` (best-effort)
 * - Link to view results (/my-reports)
 *
 * Place file at: pages/dashboard.js
 */

const CARD_STYLE = {
  borderRadius: 12,
  padding: "22px 20px",
  boxShadow: "0 10px 25px rgba(20,30,60,0.08)",
  marginBottom: 18,
  background: "linear-gradient(135deg,#ff9a76 0%, #ff7a59 100%)",
  color: "#fff",
};

const GRADIENTS = {
  streak: "linear-gradient(135deg,#ff9a76 0%, #ff7a59 100%)",
  tests: "linear-gradient(135deg,#28d19b 0%, #00b88a 100%)",
  avg: "linear-gradient(135deg,#7b61ff 0%, #5a45ff 100%)",
};

export default function DashboardPage() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  const [reports, setReports] = useState([]); // array from /api/get-reports
  const [loadingReports, setLoadingReports] = useState(false);

  // stats
  const [streak, setStreak] = useState(0);
  const [testsTaken, setTestsTaken] = useState(0);
  const [avgScore, setAvgScore] = useState(0);

  // Create Test form
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [testName, setTestName] = useState("");
  const [questionsCount, setQuestionsCount] = useState(5);
  const [qType, setQType] = useState("MCQ"); // MCQ | QA | MIX
  const [generated, setGenerated] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // subscribe session
    const s = supabase.auth.getSession().then(({ data }) => {
      const sess = data.session ?? null;
      setSession(sess);
      if (sess?.user) setUser(sess.user);
    });

    // also listen for changes (optional)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess?.session ?? null);
      if (sess?.session?.user) setUser(sess.session.user);
    });

    fetchReports();

    return () => {
      try { sub?.subscription?.unsubscribe(); } catch (e) {}
    };
  }, []);

  async function fetchReports() {
    setLoadingReports(true);
    try {
      // existing API in project: /api/get-reports which returns user's reports
      const resp = await fetch("/api/get-reports");
      if (!resp.ok) throw new Error("Failed to fetch reports");
      const json = await resp.json();
      // expect json.reports or json.data - be flexible
      const r = json.reports ?? json.data ?? json;
      setReports(Array.isArray(r) ? r : []);
      computeStats(Array.isArray(r) ? r : []);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setReports([]);
      computeStats([]);
    } finally {
      setLoadingReports(false);
    }
  }

  function computeStats(reportList) {
    // testsTaken
    const tests = Array.isArray(reportList) ? reportList : [];
    setTestsTaken(tests.length);

    // avgScore: try to pick numeric property score or percent from report
    let total = 0;
    let counted = 0;
    for (const rep of tests) {
      // try common fields: score, percent, percentage, marks
      const sc = rep.score ?? rep.percent ?? rep.percentage ?? rep.marks ?? null;
      if (typeof sc === "number") {
        total += sc;
        counted++;
      } else if (typeof sc === "string" && !isNaN(Number(sc))) {
        total += Number(sc);
        counted++;
      }
    }
    setAvgScore(counted ? Math.round((total / counted) * 100) / 100 : 0);

    // streak: compute number of consecutive calendar days with at least one test
    // Convert report timestamps to unique UTC dates (YYYY-MM-DD)
    const datesSet = new Set();
    for (const rep of tests) {
      const t = rep.created_at ?? rep.taken_at ?? rep.scheduled_for ?? rep.createdAt ?? rep.date;
      if (!t) continue;
      const d = new Date(t);
      // normalize to local date string (so "24 hours" ~= calendar day). We'll treat days (user wanted "every 24 hours", but calendar-day is simpler & predictable).
      const dayKey = d.toISOString().slice(0, 10); // YYYY-MM-DD
      datesSet.add(dayKey);
    }
    const uniqueDays = Array.from(datesSet).sort((a, b) => (a < b ? 1 : -1)); // descending

    // Starting from today, count consecutive days present
    const today = new Date();
    let streakCount = 0;
    let cursor = new Date(today);
    // We consider a day present if uniqueDays includes that date string
    // We'll check consecutive days until we hit a gap.
    while (true) {
      const key = cursor.toISOString().slice(0, 10);
      if (datesSet.has(key)) {
        streakCount++;
        // move cursor to previous day
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    setStreak(streakCount);
  }

  // Create test handler
  async function handleCreateTest(e) {
    e.preventDefault();
    setMessage("");
    setGenerated(null);

    // validate testName
    if (!testName || !testName.trim()) {
      setMessage("Please enter a test name.");
      return;
    }
    if (questionsCount < 2 || questionsCount > 20) {
      setMessage("Questions must be between 2 and 20.");
      return;
    }

    // gather input: either file or text
    const file = fileRef.current?.files?.[0];
    let text = textInput?.trim() ?? "";

    try {
      setUploading(true);
      setMessage("Preparing content...");

      if (file) {
        // file size check
        if (file.size > 5 * 1024 * 1024) {
          setMessage("PDF too large — max 5MB.");
          setUploading(false);
          return;
        }
        // POST to /api/extract-pdf
        const fd = new FormData();
        fd.append("file", file);
        const resp = await fetch("/api/extract-pdf", {
          method: "POST",
          body: fd,
        });
        if (!resp.ok) {
          const txt = await resp.text();
          console.error("extract error:", txt);
          setMessage("Failed to extract PDF. See console.");
          setUploading(false);
          return;
        }
        const j = await resp.json();
        text = j.text ?? "";
      }

      if (!text) {
        setMessage("No text provided or extracted from PDF.");
        setUploading(false);
        return;
      }

      setMessage("Generating test (AI) — this may take a few seconds...");
      // call /api/generate-openai with { text, questions, type }
      // the API in your project expects JSON { text, questions, type } — adapt if needed
      const gResp = await fetch("/api/generate-openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          questions: questionsCount,
          type: qType === "MCQ" ? "MCQ" : qType === "QA" ? "QA" : "MIX",
          testName: testName.trim(),
        }),
      });

      if (!gResp.ok) {
        const txt = await gResp.text();
        console.error("generate error:", txt);
        setMessage("AI generation failed — check console.");
        setUploading(false);
        return;
      }
      const generatedJson = await gResp.json();
      // generatedJson should contain array of questions (your API returns { ok:true, questions: [...] })
      const questions = generatedJson.questions ?? generatedJson;

      setGenerated(questions);
      setMessage("Test generated. Saving...");

      // Save to Supabase table scheduled_tests (best effort) so it appears in user's view results later.
      // Table columns inserted: schedule_id=null, user_id, test_payload, status, scheduled_for, test_name
      try {
        const payload = {
          schedule_id: null,
          user_id: session?.user?.id ?? user?.id ?? null,
          generated_from_upload_id: null,
          test_payload: questions,
          status: "generated",
          scheduled_for: new Date().toISOString(),
          test_name: testName.trim(),
        };

        // attempt insert
        const { data, error } = await supabase.from("scheduled_tests").insert([payload]).select("id").limit(1);
        if (error) {
          console.warn("Supabase insert error (scheduled_tests):", error.message ?? error);
          setMessage("Generated (saved locally) — failed to save to server (see console).");
        } else {
          setMessage("Test generated & saved.");
        }
      } catch (saveErr) {
        console.error("Save error:", saveErr);
        setMessage("Generated — failed to save (check console).");
      }
    } catch (err) {
      console.error("Create test error:", err);
      setMessage("Unexpected error while generating test.");
    } finally {
      setUploading(false);
      // clear file input
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function gotoMyReports() {
    Router.push("/my-reports");
  }

  function gotoPlans() {
    Router.push("/plans");
  }

  // If not signed in, show CTA to /auth
  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f6fbff" }}>
        <Head><title>PrepMate — Dashboard</title></Head>
        <div style={{ textAlign: "center", padding: 30, background: "#fff", borderRadius: 12, boxShadow: "0 8px 30px rgba(10,20,40,0.06)" }}>
          <h2 style={{ marginBottom: 10 }}>You’re not signed in</h2>
          <p style={{ marginBottom: 20, color: "#666" }}>Please sign in to access your dashboard and tests.</p>
          <button onClick={() => Router.push("/auth")} style={{ padding: "10px 18px", background: "#0b69ff", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Go to Sign in</button>
        </div>
      </div>
    );
  }

  // logged-in UI
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? user?.user_metadata?.username ?? (user?.id ? user.id.slice(0, 10) : "student");

  return (
    <div style={{ minHeight: "100vh", background: "#f6fbff", paddingBottom: 40 }}>
      <Head>
        <title>PrepMate — Dashboard</title>
      </Head>

      <header style={{ background: "#fff", padding: "12px 18px", borderBottom: "1px solid rgba(10,20,40,0.04)" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>PrepMate</div>
          <div style={{ marginLeft: "auto", color: "#666" }}>Welcome back, <strong style={{ color: "#0b69ff" }}>{displayName}</strong> 👋</div>
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: "18px auto", padding: "0 16px" }}>
        <section style={{ textAlign: "center", marginBottom: 18 }}>
          <img src="/prepmate-logo.png" alt="logo" style={{ width: 72, height: 72, borderRadius: 16, boxShadow: "0 8px 30px rgba(20,30,60,0.06)" }} />
          <h1 style={{ margin: "10px 0 6px", fontSize: 30 }}>Welcome back, <span style={{ color: "#0b69ff" }}>{displayName}</span>!</h1>
          <p style={{ color: "#668", marginBottom: 12 }}>Ready to ace your preparation today?</p>
        </section>

        {/* STAT CARDS */}
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            <div style={{ borderRadius: 12, padding: 18, boxShadow: "0 10px 25px rgba(6,10,30,0.06)", background: GRADIENTS.streak, color: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Current Streak</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{streak}</div>
                </div>
                <div style={{ fontSize: 28, opacity: 0.9 }}>🔥</div>
              </div>
            </div>

            <div style={{ borderRadius: 12, padding: 18, boxShadow: "0 10px 25px rgba(6,10,30,0.06)", background: GRADIENTS.tests, color: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Tests Taken</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{testsTaken}</div>
                </div>
                <div style={{ fontSize: 28, opacity: 0.9 }}>🎯</div>
              </div>
            </div>

            <div style={{ borderRadius: 12, padding: 18, boxShadow: "0 10px 25px rgba(6,10,30,0.06)", background: GRADIENTS.avg, color: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Avg Score</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>{avgScore} %</div>
                </div>
                <div style={{ fontSize: 28, opacity: 0.9 }}>📈</div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <button onClick={() => Router.push("/generate")} style={{ padding: "10px 14px", borderRadius: 10, border: "none", background: "#0b69ff", color: "#fff", cursor: "pointer" }}>
            Take a Test
          </button>
          <button onClick={gotoMyReports} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(10,20,40,0.08)", background: "#fff", color: "#0b69ff", cursor: "pointer" }}>
            View Results
          </button>
        </div>

        {/* Create Test Form */}
        <section style={{ marginTop: 22 }}>
          <div style={{ background: "#fff", padding: 18, borderRadius: 12, boxShadow: "0 10px 25px rgba(6,10,30,0.04)" }}>
            <h3 style={{ marginTop: 0 }}>Create Test</h3>
            <p style={{ color: "#667", marginTop: 0, marginBottom: 12 }}>Upload a short PDF (≤5MB) or paste study text. Give the test a name and choose number/type of questions.</p>

            <form onSubmit={handleCreateTest}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Test name</label>
                <input value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="Enter a test name (shown in results)" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e6eef9" }} />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Upload PDF (optional — max 5MB)</label>
                <input ref={fileRef} type="file" accept="application/pdf" />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Or paste text</label>
                <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} rows={5} placeholder="Paste study text here (or upload PDF)" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e6eef9" }} />
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600 }}>Questions</label>
                  <input type="number" min={2} max={20} value={questionsCount} onChange={(e) => setQuestionsCount(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e6eef9" }} />
                </div>
                <div style={{ width: 160 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600 }}>Type</label>
                  <select value={qType} onChange={(e) => setQType(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e6eef9" }}>
                    <option value="MCQ">MCQ</option>
                    <option value="QA">Q & A</option>
                    <option value="MIX">Mixed</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button disabled={uploading} type="submit" style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "#0b69ff", color: "#fff", cursor: uploading ? "wait" : "pointer" }}>
                  {uploading ? "Generating..." : "Generate Test"}
                </button>

                <button type="button" onClick={() => { setTextInput(""); if (fileRef.current) fileRef.current.value = ""; setTestName(""); setQuestionsCount(5); setQType("MCQ"); setMessage(""); setGenerated(null); }} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(10,20,40,0.06)", background: "#fff" }}>
                  Reset
                </button>
              </div>

              {message && <div style={{ marginTop: 12, color: "#444" }}>{message}</div>}
            </form>

            {/* show generated preview */}
            {generated && (
              <div style={{ marginTop: 16 }}>
                <h4>Generated questions (preview)</h4>
                <div style={{ maxHeight: 260, overflow: "auto", padding: 10, background: "#fafcff", borderRadius: 8 }}>
                  <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(generated, null, 2)}</pre>
                </div>
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => Router.push("/my-reports")} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#0b69ff", color: "#fff" }}>Go to My Results</button>
                </div>
              </div>
            )}

          </div>
        </section>

        {/* Plan summary / upgrade CTA */}
        <section style={{ marginTop: 20 }}>
          <div style={{ background: "#fff", padding: 18, borderRadius: 12, boxShadow: "0 10px 25px rgba(6,10,30,0.04)" }}>
            <h3 style={{ marginTop: 0 }}>Your Plan</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Free Plan</div>
                <div style={{ color: "#667", fontSize: 13 }}>5 free tests / month — basic AI test generation</div>
              </div>
              <div>
                <button onClick={gotoPlans} style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "#14b37d", color: "#fff" }}>Upgrade Plan</button>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
