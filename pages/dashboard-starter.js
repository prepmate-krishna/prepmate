// pages/dashboard-starter.js
import { useEffect, useState, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase"; // make sure this export exists
import styles from "styled-jsx/css?global"; // inline styles approach

export default function DashboardStarter() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [loadingStats, setLoadingStats] = useState(true);
  const [streak, setStreak] = useState(0);
  const [testsTaken, setTestsTaken] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showNotebook, setShowNotebook] = useState(false);
  const [showRevision, setShowRevision] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const MAX_UPLOAD_MB = 30;

  // fetch current user
  useEffect(() => {
    const s = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // try to obtain a friendly username: prefer user_metadata.full_name or email prefix
        const meta = session.user.user_metadata || {};
        const name = meta.full_name || meta.name || session.user.email?.split("@")[0] || session.user.id;
        setUsername(name);
        fetchStats(session.user);
      } else {
        // not logged in — redirect to /auth
        router.push("/auth");
      }
    });

    // check immediately
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        const u = session.session.user;
        setUser(u);
        const meta = u.user_metadata || {};
        setUsername(meta.full_name || meta.name || u.email?.split("@")[0] || u.id);
        fetchStats(u);
      } else {
        // not logged in yet - let listener handle or redirect
        // router.push("/auth");
      }
    })();

    return () => s?.subscription?.unsubscribe?.();
  }, []);

  // Fetch user stats from your DB (adjust table/field names to your schema)
  async function fetchStats(userObj) {
    setLoadingStats(true);
    try {
      // Example supabase table: "user_stats" with columns user_id, streak, tests_taken
      const { data, error } = await supabase
        .from("user_stats")
        .select("streak,tests_taken")
        .eq("user_id", userObj.id)
        .single();

      if (!error && data) {
        setStreak(data.streak ?? 0);
        setTestsTaken(data.tests_taken ?? 0);
      } else {
        // if not present, initialize (optional)
        setStreak(0);
        setTestsTaken(0);
      }
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setLoadingStats(false);
    }
  }

  // Upload PDF (30MB limit) and call extract/generate flow (this function only uploads to supabase storage or calls /api/extract-pdf)
  async function handleUploadAndGenerate(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return alert("Please choose a file first.");
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      return alert(`File size exceeds ${MAX_UPLOAD_MB} MB limit.`);
    }

    setUploading(true);
    try {
      // Option A: call /api/extract-pdf directly using multipart form (you already have an API).
      const form = new FormData();
      form.append("file", file);

      const resp = await fetch("/api/extract-pdf", {
        method: "POST",
        body: form,
      });

      if (!resp.ok) {
        const txt = await resp.text();
        console.error("extract-pdf error:", txt);
        alert("Failed to extract PDF. See console for details.");
        setUploading(false);
        return;
      }

      const json = await resp.json();
      const text = json.text || "";

      // Redirect to generate page with extracted text (we pass via sessionStorage to avoid URL length issues)
      sessionStorage.setItem("prepmate_extracted_text", text);
      router.push("/generate");
    } catch (err) {
      console.error("Upload/generate error:", err);
      alert("Upload failed — check console.");
    } finally {
      setUploading(false);
    }
  }

  function handleGoToGenerate() {
    // option: if user wants AI generation from blank input, go to /generate
    router.push("/generate");
  }

  async function handleCompleteSetup() {
    // Example: mark plan active (starter) in your DB (calls /api/save-plan or directly via supabase)
    try {
      const payload = {
        user_id: user.id,
        plan: "starter",
        status: "active",
      };
      const { data, error } = await supabase.from("user_plans").upsert(payload).select();
      if (error) {
        console.error("Plan save error", error);
        alert("Failed to save plan. See console.");
        return;
      }
      alert("Plan activated — Starter Plan (₹299/month).");
      // maybe redirect to main dashboard
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
      <Head>
        <title>PrepMate — Starter Plan</title>
        <meta name="description" content="PrepMate Starter Plan dashboard" />
      </Head>

      <div className="page">
        <div className="topbar">
          <img src="/prepmate-logo.png" className="logo" alt="PrepMate" />
          <div className="brand">PrepMate</div>
        </div>

        <main className="container">
          <h1 className="welcome">Welcome back, <span className="username">{username || "student"}</span>!</h1>
          <p className="sub">Your personalized prep dashboard — Starter Plan</p>

          <section className="cardsGrid">
            <Card gradient="#0f172a,#071033">
              <CardTitle title="Current Streak" subtitle={String(streak)} icon="🔥" />
            </Card>

            <Card gradient="#5b21b6,#06b6d4">
              <CardTitle title="Tests Taken" subtitle={String(testsTaken)} icon="✓" />
            </Card>

            <div className="wideCard">
              <div className="cardHeader">
                <div className="cardTitle">Weakness Heatmap</div>
                <button className="smallBtn" onClick={() => setShowHeatmap(true)}>Open</button>
              </div>
              <div className="cardBody">Color-coded topics where you need improvement.</div>
            </div>

            <div className="wideCard">
              <div className="cardHeader">
                <div className="cardTitle">Revision Planner</div>
                <button className="smallBtn" onClick={() => setShowRevision(true)}>Open</button>
              </div>
              <div className="cardBody">Smart reminders based on forgetting curve.</div>
            </div>

            <div className="wideCard">
              <div className="cardHeader">
                <div className="cardTitle">Error Notebook</div>
                <button className="smallBtn" onClick={() => setShowNotebook(true)}>Open</button>
              </div>
              <div className="cardBody">All your wrong questions turned into flashcards.</div>
            </div>

            <div className="takeTest">
              <div className="takeTestInner">
                <div className="takeTitle">Take New Test</div>
                <div className="takeSub">Upload PDF (≤ 30MB) or generate AI test</div>

                <form onSubmit={handleUploadAndGenerate} className="uploadForm">
                  <input ref={fileRef} type="file" accept="application/pdf" />
                  <div className="actionsRow">
                    <button type="submit" className="primaryBtn" disabled={uploading}>
                      {uploading ? "Uploading..." : "Upload & Generate"}
                    </button>
                    <button type="button" className="ghostBtn" onClick={handleGoToGenerate}>AI Generate</button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          <section className="planBar">
            <div className="planInfo">
              <div className="planLabel">Starter Plan</div>
              <div className="price">₹299/month</div>
            </div>
            <div className="planActions">
              <button className="linkBtn" onClick={() => router.push("/plans")}>Upgrade plan</button>
              <button className="greenBtn" onClick={handleCompleteSetup}>Complete Setup</button>
            </div>
          </section>
        </main>

        {/* Modals / Overlays */}
        {showHeatmap && (
          <Modal onClose={() => setShowHeatmap(false)} title="Weakness Heatmap">
            <p>Heatmap will show topics in red/orange/yellow/green. (Placeholder)</p>
            <div className="heatmapMock">
              <div className="hmRow"><strong>Mechanics</strong> — <span className="bad">40%</span></div>
              <div className="hmRow"><strong>Electrostatics</strong> — <span className="ok">60%</span></div>
              <div className="hmRow"><strong>Optics</strong> — <span className="good">80%</span></div>
            </div>
          </Modal>
        )}

        {showNotebook && (
          <Modal onClose={() => setShowNotebook(false)} title="Error Notebook">
            <p>List of wrong questions saved as flashcards. (Placeholder)</p>
            <ul>
              <li>Q: Why does object A behave like B? — AI-flashcard</li>
              <li>Q: Calculate electric field at point X (wrong) — AI-flashcard</li>
            </ul>
          </Modal>
        )}

        {showRevision && (
          <Modal onClose={() => setShowRevision(false)} title="Smart Revision Planner">
            <p>Today's recommended revisions (based on forgetting curve):</p>
            <ol>
              <li>Electrostatics — practice set (recommended)</li>
              <li>Mechanics — short recap</li>
            </ol>
          </Modal>
        )}

        <style jsx>{globalStyles}</style>
      </div>
    </>
  );
}

/* --- UI Helper Components --- */

function Card({ children, gradient }) {
  return (
    <div className="card" style={{ background: `linear-gradient(135deg, ${gradient})` }}>
      {children}
      <style jsx>{`
        .card { padding: 20px; border-radius: 12px; color: white; min-height: 110px; display:flex; flex-direction:column; justify-content:space-between; box-shadow: 0 6px 20px rgba(0,0,0,0.35); }
      `}</style>
    </div>
  );
}

function CardTitle({ title, subtitle, icon }) {
  return (
    <div className="cardTitleWrap">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="cardSmall">{title}</div>
          <div className="cardBig">{subtitle}</div>
        </div>
        <div className="iconWrap">{icon}</div>
      </div>
      <style jsx>{`
        .cardSmall { font-size: 14px; opacity: 0.9; }
        .cardBig { font-size: 32px; font-weight:700; margin-top:6px; }
        .iconWrap { font-size: 28px; opacity:0.95; }
      `}</style>
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div className="modalOverlay">
      <div className="modal">
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button className="modalClose" onClick={onClose}>✕</button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
      <style jsx>{`
        .modalOverlay { position: fixed; inset:0; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.5); z-index: 1200; }
        .modal { width: min(720px, 96%); background: #fff; border-radius: 12px; padding: 18px; box-shadow: 0 12px 40px rgba(0,0,0,0.45); }
        .modalHeader { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .modalTitle { font-weight:600; font-size:18px; }
        .modalClose { background:transparent; border:none; cursor:pointer; font-size:18px; }
      `}</style>
    </div>
  );
}

/* --- Styles --- */

const globalStyles = `
body { margin: 0; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
.page { min-height: 100vh; background: radial-gradient(1200px 800px at 10% 10%, #071033 0%, #1b123b 40%, #120826 100%); color: #fff; }
.topbar { display:flex; align-items:center; gap:12px; padding: 18px 24px; background: transparent; }
.logo { width:40px; height:40px; object-fit:contain; border-radius:8px; background: rgba(255,255,255,0.06); padding:6px; }
.brand { font-weight:700; font-size:18px; color: #fff; }
.container { max-width: 980px; margin: 10px auto; padding: 18px; }
.welcome { font-size: 32px; margin: 6px 0 4px 0; color: #ffffff; text-shadow: 0 4px 24px rgba(0,0,0,0.5); }
.username { color: #fff; font-weight:700; }
.sub { color: rgba(255,255,255,0.85); margin-bottom: 18px; opacity: 0.95; }

.cardsGrid { display:grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 18px; align-items:start; }
/* wide card spans both columns */
.wideCard { grid-column: 1 / -1; background: linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03)); padding: 18px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); color: #fff; }
.cardHeader { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.cardTitle { font-weight:700; font-size:18px; }
.cardBody { color: rgba(255,255,255,0.9); opacity:0.95; }
.smallBtn { background: rgba(255,255,255,0.06); color: #fff; border: none; padding: 8px 12px; border-radius: 8px; cursor:pointer; }

.takeTest { grid-column: 1 / -1; margin-top:8px; }
.takeTestInner { background: linear-gradient(90deg, rgba(0,30,80,0.4), rgba(12,35,90,0.45)); padding: 18px; border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,0.6); }
.takeTitle { font-size:20px; font-weight:700; margin-bottom:4px; }
.takeSub { color: rgba(255,255,255,0.9); margin-bottom:10px; opacity:0.95; }

.uploadForm input[type="file"] { background: transparent; color: #fff; border-radius: 8px; margin-bottom: 12px; }
.actionsRow { display:flex; gap:10px; }
.primaryBtn { background: linear-gradient(90deg,#6b21a8,#06b6d4); padding:10px 14px; border-radius:10px; border:none; color:#fff; cursor:pointer; }
.ghostBtn { background:transparent; border:1px solid rgba(255,255,255,0.12); padding:10px 14px; border-radius:10px; color:#fff; cursor:pointer; }

.planBar { margin-top: 18px; display:flex; justify-content:space-between; align-items:center; gap: 12px; }
.planInfo { color: #fff; }
.planLabel { font-weight:700; font-size:18px; }
.price { color: rgba(255,255,255,0.9); opacity: 0.95; margin-top:4px; }
.planActions { display:flex; gap:10px; }
.linkBtn { background: transparent; border: 1px solid rgba(255,255,255,0.12); color: #fff; padding:8px 12px; border-radius:10px; cursor:pointer; }
.greenBtn { background: linear-gradient(90deg,#059669,#10b981); border:none; padding:10px 14px; color:#fff; border-radius:10px; cursor:pointer; box-shadow: 0 8px 26px rgba(5,150,105,0.18); }

.card { color: #fff; }

.heatmapMock .hmRow { padding: 8px 0; border-bottom: 1px dashed rgba(0,0,0,0.06); }
.heatmapMock .bad { color: #ff7043; font-weight:700; }
.heatmapMock .ok { color: #f59e0b; font-weight:700; }
.heatmapMock .good { color: #34d399; font-weight:700; }

/* responsive */
@media (max-width: 720px) {
  .cardsGrid { grid-template-columns: repeat(1, 1fr); }
  .welcome { font-size: 26px; }
}
`;

/* end global styles */
