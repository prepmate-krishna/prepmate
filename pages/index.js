// pages/index.js
import Head from "next/head";
import dynamic from "next/dynamic";
import Link from "next/link";

// Client-only auth UI (dynamic, ssr: false so build won't fail)
const AuthClient = dynamic(() => import("../components/AuthClient"), { ssr: false });

// Luxury palette
const COLORS = {
  BG: "#0A0A0A",          // Matte black
  CARD: "#121212",        // Charcoal card
  TIF: "#40E0D0",         // Tiffany green
  EMERALD: "#0DBD8B",     // Jewel green
  WHITE: "#EAEAEA",       // Soft white
  MUTED: "#9AA0A6",       // Muted gray
};

export default function Home() {
  return (
    <>
      <Head>
        <title>PrepMate — AI Test Prep</title>
        <meta name="description" content="PrepMate — Upload materials, generate tests, and get AI analysis." />
        <link rel="icon" href="/prepmate-logo.png" />
      </Head>

      <div style={{
        minHeight: "100vh",
        background: COLORS.BG,
        color: COLORS.WHITE,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily: "Inter, system-ui, -apple-system, Arial",
      }}>
        <div style={{
          width: "100%",
          maxWidth: 1120,
          display: "grid",
          gridTemplateColumns: "1fr 420px",
          gap: 40,
          alignItems: "center",
        }}>

          {/* LEFT: Hero */}
          <section aria-label="Hero" style={{ color: COLORS.WHITE }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <img src="/prepmate-logo.png" alt="PrepMate logo" style={{ width: 88, height: "auto", borderRadius: 14 }} />
              <div>
                <h1 style={{ margin: 0, fontSize: "2.4rem", lineHeight: 1.05, color: COLORS.TIF }}>
                  PrepMate
                </h1>
                <div style={{ color: COLORS.MUTED, marginTop: 6, fontSize: "0.95rem" }}>
                  Your AI preparation partner — smart tests, instant analysis.
                </div>
              </div>
            </div>

            <div style={{ marginTop: 28, color: COLORS.MUTED, maxWidth: 560, fontSize: "1.05rem" }}>
              <p style={{ marginTop: 0 }}>
                Upload study materials and create adaptive tests in seconds. MCQs with tricky but fair options, clear explanations, and AI-powered performance reports that highlight weak concepts.
              </p>

              <ul style={{ marginTop: 18, paddingLeft: 18, color: COLORS.MUTED }}>
                <li style={{ marginBottom: 8 }}>Generate MCQ, Q&A, or Mixed tests (2–20 questions)</li>
                <li style={{ marginBottom: 8 }}>AI explanations for wrong answers with 200-word concept summaries</li>
                <li style={{ marginBottom: 8 }}>Save reports, track progress, and schedule recurring tests</li>
              </ul>

              <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
                <Link href="/generate">
                  <a style={{
                    background: COLORS.TIF,
                    color: COLORS.BG,
                    padding: "10px 16px",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = COLORS.EMERALD}
                  onMouseOut={(e) => e.currentTarget.style.background = COLORS.TIF}>
                    Try a sample test
                  </a>
                </Link>
                <Link href="/my-reports">
                  <a style={{
                    border: `1px solid ${COLORS.TIF}`,
                    color: COLORS.TIF,
                    padding: "10px 16px",
                    borderRadius: 10,
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.border = `1px solid ${COLORS.EMERALD}`;
                    e.currentTarget.style.color = COLORS.EMERALD;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.border = `1px solid ${COLORS.TIF}`;
                    e.currentTarget.style.color = COLORS.TIF;
                  }}>
                    My reports
                  </a>
                </Link>
              </div>
            </div>
          </section>

          {/* RIGHT: Auth Card */}
          <aside aria-label="Auth" style={{
            background: COLORS.CARD,
            padding: 26,
            borderRadius: 16,
            boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
            minHeight: 340,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <img src="/prepmate-logo.png" alt="PrepMate" style={{ width: 48, height: "auto", borderRadius: 10 }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.TIF }}>Welcome back</div>
                <div style={{ fontSize: 12, color: COLORS.MUTED }}>Sign in to access your tests & reports</div>
              </div>
            </div>

            <div style={{ marginTop: 6, marginBottom: 14 }}>
              <AuthClient />
            </div>

            <div style={{
              marginTop: "auto",
              borderTop: "1px solid rgba(64,224,208,0.12)",
              paddingTop: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: COLORS.MUTED,
              fontSize: 12,
            }}>
              <div>Need help? <a href="/setup-profile" style={{ color: COLORS.TIF, textDecoration: "underline" }}>Get started</a></div>
              <div style={{ opacity: 0.9 }}>v1.0</div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
