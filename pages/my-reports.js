// pages/my-reports.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function MyReports() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await supabase.auth.getUser();
      const sbUser = r?.data?.user ?? null;
      if (!mounted) return;
      if (!sbUser) {
        setError("Not signed in");
        setLoading(false);
        return;
      }
      setUserId(sbUser.id);

      try {
        const resp = await fetch("/api/get-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supabaseUserId: sbUser.id }),
        });
        const body = await resp.json();
        setReports(body.reports || []);
      } catch (err) {
        setError("Failed to fetch reports: " + (err.message || err));
      } finally {
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <h1>My Reports</h1>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "crimson" }}>{error}</div>}

      {!loading && !error && reports.length === 0 && <div>No reports yet — take a test to save one.</div>}

      {!loading && reports.length > 0 && (
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <h3>Saved Reports</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {reports.map((r) => (
                <li key={r.id} style={{ padding: 10, borderBottom: "1px solid #eee", cursor: "pointer" }} onClick={() => setSelected(r)}>
                  <div><strong>{new Date(r.created_at).toLocaleString()}</strong></div>
                  <div>Questions: {r.total_questions} · Attempted: {r.attempted} · Correct: {r.correct}</div>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ flex: 2 }}>
            {selected ? (
              <div>
                <h3>Report details</h3>
                <div><strong>Date:</strong> {new Date(selected.created_at).toLocaleString()}</div>
                <div><strong>Total:</strong> {selected.total_questions}</div>
                <div><strong>Attempted:</strong> {selected.attempted}</div>
                <div><strong>Correct:</strong> {selected.correct}</div>
                <div style={{ marginTop: 12 }}>
                  <strong>Weak topics:</strong>
                  <div>{selected.weak_topics && selected.weak_topics.length ? selected.weak_topics.join(", ") : "—"}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <strong>AI explanations:</strong>
                  {selected.ai_explanations && selected.ai_explanations.length ? (
                    selected.ai_explanations.map((ex, idx) => (
                      <div key={idx} style={{ padding: 8, border: "1px solid #f0f0f0", marginBottom: 8 }}>
                        <div><strong>Q{ex.index + 1}:</strong> {ex.question}</div>
                        <div><em>Explanation:</em> {ex.explanation}</div>
                        {ex.references && <div><strong>Refs:</strong> {ex.references.join(", ")}</div>}
                      </div>
                    ))
                  ) : <div>No AI explanations saved.</div>}
                </div>
              </div>
            ) : (
              <div>Select a report to view details</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
