// pages/index.js
import Head from "next/head";
import dynamic from "next/dynamic";
import { useState } from "react";

// Client-only auth UI (avoid SSR build-time execution)
const AuthClient = dynamic(() => import("../components/AuthClient"), { ssr: false });

// Palette B — Trust & Focus
const COLORS = {
  BG: "#F6F8FA",        // page background (soft light)
  CARD: "#FFFFFF",      // card surface
  PRIMARY: "#0B66FF",   // deep azure (brand accent / primary CTA)
  ACCENT: "#0A9E7E",    // teal accent
  TEXT: "#0F1724",      // primary text (near-black)
  MUTED: "#64748B",     // muted text
  SOFT_SHADOW: "0 10px 30px rgba(15,23,36,0.06)",
};

export default function Home() {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <>
      <Head>
        <title>PrepMate — AI Test Prep</title>
        <meta name="description" content="PrepMate — Upload a document and let the AI create practice tests & explanations." />
        <link rel="icon" href="/prepmate-logo.png" />
      </Head>

      <div style={{ minHeight: "100vh", background: COLORS.BG, color: COLORS.TEXT, fontFamily: "Inter, system-ui, -apple-system, Arial" }}>
        <header style={{ maxWidth: 1120, margin: "28px auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/prepmate-logo.png" alt="PrepMate" style={{ width: 48, height: "auto", borderRadius: 8 }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.TEXT }}>PrepMate</div>
              <div style={{ fontSize: 12, color: COLORS.MUTED }}>AI tests & analysis</div>
            </div>
          </div>

          <nav style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <a href="/my-reports" style={{ color: COLORS.MUTED, textDecoration: "none", fontSize: 14 }}>Reports</a>
            <a href="/generate" style={{ color: COLORS.MUTED, textDecoration: "none", fontSize: 14 }}>Generate</a>
            <div style={{ width: 1, height: 24, background: "#E6EEF9" }} />
            <div style={{ width: 220, display: "flex", justifyContent: "flex-end" }}>
              <AuthClient />
            </div>
          </nav>
        </header>

        <main style={{ maxWidth: 1120, margin: "20px auto 80px", padding: "0 20px", display: "grid", gridTemplateColumns: "1fr 420px", gap: 28, alignItems: "start" }}>

          {/* LEFT: Conversational AI Hero */}
          <section aria-label="AI hero" style={{ padding: 28 }}>
            <div style={{ maxWidth: 760 }}>
              <h1 style={{ margin: 0, fontSize: "2.2rem", lineHeight: 1.05, color: COLORS.TEXT }}>
                Upload a document — get a smart test in seconds
              </h1>
              <p style={{ color: COLORS.MUTED, marginTop: 12, fontSize: 16 }}>
                PrepMate reads your notes and generates thoughtful questions (MCQ, short-answer, or mixed). After the test it gives clear explanations and a short 200-word concept summary for any wrong answers.
              </p>

              <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  onClick={() => setShowUpload((s) => !s)}
                  style={{
                    background: COLORS.PRIMARY,
                    color: "#fff",
                    border: "none",
                    padding: "12px 18px",
                    borderRadius: 10,
                    fontWeight: 600,
                    boxShadow: COLORS.SOFT_SHADOW,
                    cursor: "pointer"
                  }}
                >
                  {showUpload ? "Hide upload" : "Upload document"}
                </button>

                <button
                  onClick={() => { setChatOpen(true); window.scrollTo({ top: 200, behavior: "smooth" }); }}
                  style={{
                    background: "transparent",
                    color: COLORS.PRIMARY,
                    border: `1px solid ${COLORS.PRIMARY}`,
                    padding: "10px 16px",
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Start conversational flow
                </button>

                <a href="/generate" style={{ marginLeft: "12px", color: COLORS.MUTED, textDecoration: "none", fontSize: 14 }}>Or try a sample test</a>
              </div>

              {/* Upload area */}
              {showUpload && (
                <div style={{ marginTop: 20, background: COLORS.CARD, padding: 16, borderRadius: 12, boxShadow: COLORS.SOFT_SHADOW }}>
                  <label style={{ display: "block", fontSize: 13, color: COLORS.MUTED, marginBottom: 8 }}>Drop or choose a PDF / DOCX</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setUploadText(`Selected: ${f.name} (${Math.round(f.size/1024)} KB)`);
                        else setUploadText("");
                      }}
                      style={{ padding: 8 }}
                    />
                    <button
                      onClick={() => alert("Upload handled by the UI backend in your app (this is a demo).")}
                      style={{ background: COLORS.ACCENT, color: "#fff", border: "none", padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}
                    >
                      Upload & generate
                    </button>
                  </div>
                  {uploadText && <div style={{ marginTop: 10, color: COLORS.MUTED }}>{uploadText}</div>}
                </div>
              )}

              {/* Chat-like flow */}
              <div style={{ marginTop: 28 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 10, background: COLORS.CARD, boxShadow: COLORS.SOFT_SHADOW, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/prepmate-logo.png" alt="logo" style={{ width: 36 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.TEXT }}>AI Tutor</div>
                    <div style={{ fontSize: 13, color: COLORS.MUTED }}>Ask the assistant to tailor a test or explain answers</div>
                  </div>
                </div>

                <div style={{ marginTop: 12, background: COLORS.CARD, borderRadius: 12, padding: 12, boxShadow: COLORS.SOFT_SHADOW }}>
                  <div style={{ maxHeight: 260, overflow: "auto", padding: 8 }}>
                    {/* sample chat messages */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, color: COLORS.MUTED }}>User</div>
                      <div style={{ marginTop: 6, padding: 10, background: "#F1F5F9", borderRadius: 10, color: COLORS.TEXT }}>Create a 5-question MCQ test on photosynthesis.</div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, color: COLORS.MUTED }}>PrepMate</div>
                      <div style={{ marginTop: 6, padding: 10, background: "#EDF8F7", borderRadius: 10, color: COLORS.TEXT }}>
                        Sure — generating 5 MCQs now. (The real generation calls your `/api/generate-openai` server endpoint.)
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <input
                      placeholder="Type a request — e.g. 'Make 8 mixed questions on electrostatics'"
                      style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #E6EEF9" }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          alert("This demo input would call the generate API in your app.");
                        }
                      }}
                    />
                    <button onClick={() => alert("This would call the backend generate endpoint")} style={{ background: COLORS.PRIMARY, color: "#fff", border: "none", padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}>
                      Ask
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT: Quick action + compact auth (card) */}
          <aside style={{ background: COLORS.CARD, padding: 20, borderRadius: 12, boxShadow: COLORS.SOFT_SHADOW }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.TEXT, marginBottom: 8 }}>Quick actions</div>

            <div style={{ display: "grid", gap: 10 }}>
              <button onClick={() => window.location.href = "/upload"} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.PRIMARY}`, background: "transparent", color: COLORS.PRIMARY, cursor: "pointer" }}>
                Upload materials
              </button>
              <button onClick={() => window.location.href = "/generate"} style={{ padding: "10px 12px", borderRadius: 8, border: "none", background: COLORS.PRIMARY, color: "#fff", cursor: "pointer" }}>
                Generate test
              </button>
              <button onClick={() => window.location.href = "/my-reports"} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #E6EEF9", background: "transparent", color: COLORS.MUTED, cursor: "pointer" }}>
                View reports
              </button>
            </div>

            <div style={{ height: 1, background: "#F1F5F9", margin: "16px 0" }} />

            <div style={{ fontSize: 13, color: COLORS.MUTED, marginBottom: 8 }}>Account</div>
            <div><AuthClient /></div>

            <div style={{ marginTop: 16, fontSize: 12, color: COLORS.MUTED }}>
              <div>Need help? <a href="/setup-profile" style={{ color: COLORS.PRIMARY }}>Get started</a></div>
            </div>
          </aside>
        </main>

        <footer style={{ maxWidth: 1120, margin: "0 auto 60px", padding: "0 20px", color: COLORS.MUTED, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>© {new Date().getFullYear()} PrepMate</div>
            <div style={{ display: "flex", gap: 12 }}>
              <a href="/terms" style={{ color: COLORS.MUTED, textDecoration: "none" }}>Terms</a>
              <a href="/privacy" style={{ color: COLORS.MUTED, textDecoration: "none" }}>Privacy</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
