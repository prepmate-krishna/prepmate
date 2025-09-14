// pages/my-reports.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Minimal reports page that lists saved reports and shows AI analysis (weak_topics + explanations).
 * - If AI analysis missing, allows running /api/analyze-report to generate & save it.
 */

export default function MyReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        // Fetch reports for signed in user
        const { data: user } = await supabase.auth.getUser();
        const supabaseUserId = user?.data?.user?.id ?? null;
        if (!supabaseUserId) {
          setError("Please sign in to see your reports.");
          setLoading(false);
          return;
        }

        // Adjust query to your schema: reports -> join tests maybe
        const { data, error: qErr } = await supabase
          .from("reports")
          .select("id, test_id, total_questions, attempted, correct, wrong, weak_topics, ai_explanations, created_at")
          .order("created_at", { ascending: false })
          .limit(100);

        if (qErr) {
          console.error("Failed loading reports:", qErr);
          setError("Failed to load reports.");
        } else {
          setReports(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Load reports error:", e);
        setError("Error loading reports.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const viewReport = (r) => {
    setSelected(r);
  };

  const runAnalysis = async (r) => {
    if (!r?.id) return;
    setBusy(true);
    setError("");
    try {
      const resp = await fetch("/api/analyze-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: r.id })
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json?.error || JSON.stringify(json));
      }
      // Update local state with returned `updated` row if present
      const updated = json?.updated ?? json?.ai ?? null;
      if (updated) {
        // replace in list
        setReports((prev) => prev.map((p) => (p.id === r.id ? { ...p, ...updated } : p)));
        setSelected((s) => (s && s.id === r.id ? { ...s, ...updated } : s));
      }
    } catch (e) {
      console.error("Analyze error:", e);
      setError("AI analysis failed: " + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading reports…</div>;
  if (error) return <div style={{ padding: 20, color: "crimson" }}>Error: {error}</div>;

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <h1>My Reports</h1>

      {reports.length === 0 ? (
        <div>No reports yet — take a test to save one.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {reports.map((r) => (
            <div key={r.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div><strong>Report ID:</strong> {r.id}</div>
                <div><small>Test ID: {r.test_id}</small></div>
                <div><small>Saved: {new Date(r.created_at).toLocaleString()}</small></div>
                <div><small>Score: {r.correct ?? "-"} / {r.total_questions ?? "-"}</small></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => viewReport(r)} style={{ padding: "8px 10px" }}>View</button>
                <button onClick={() => runAnalysis(r)} style={{ padding: "8px 10px" }} disabled={busy}>
                  {busy ? "Working…" : "Run AI analysis"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ marginTop: 20, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <h2>Report details</h2>
          <div><strong>Report ID:</strong> {selected.id}</div>
          <div><strong>Test ID:</strong> {selected.test_id}</div>
          <div><strong>Saved:</strong> {new Date(selected.created_at).toLocaleString()}</div>
          <div style={{ marginTop: 10 }}>
            <strong>Score:</strong> {selected.correct ?? "-"} / {selected.total_questions ?? "-"} &nbsp;
            <span style={{ color: "gray" }}> (Attempted: {selected.attempted ?? "-"})</span>
          </div>

          <hr style={{ margin: "12px 0" }} />

          <div>
            <h3>Weak topics</h3>
            {selected.weak_topics && selected.weak_topics.length > 0 ? (
              <ul>
                {selected.weak_topics.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            ) : (
              <div style={{ color: "#666" }}>No weak topics identified yet.</div>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            <h3>AI Explanations</h3>
            {selected.ai_explanations && selected.ai_explanations.length > 0 ? (
              selected.ai_explanations.map((ex, idx) => (
                <div key={idx} style={{ padding: 10, border: "1px solid #f0f0f0", borderRadius: 6, marginBottom: 8 }}>
                  <div style={{ fontSize: 14 }}><strong>Q{(ex.index ?? idx) + 1}.</strong> {ex.explanation}</div>
                  {ex.references && ex.references.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <small>Refs: {ex.references.join(", ")}</small>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ color: "#666" }}>AI analysis pending or not available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
