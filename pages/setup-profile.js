// pages/setup-profile.js
import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

// Try to import supabase client if available (best-effort)
let supabaseClient = null;
try {
  // adjust import if your client export differs
  // e.g. export default from '../lib/supabase' -> then change accordingly
  // If this file doesn't exist or export, the try/catch will swallow the error.
  // This keeps the page working even without Supabase configured.
  // eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
  // @ts-ignore
  supabaseClient = require("../lib/supabase").supabaseClient ?? require("../lib/supabase").default ?? null;
} catch (e) {
  supabaseClient = null;
}

const COLORS = {
  BG: "#F6F8FA",
  CARD: "#FFFFFF",
  PRIMARY: "#0B66FF",
  MUTED: "#64748B",
  INPUT_BG: "#FBFDFF",
  SHADOW: "0 12px 30px rgba(15,23,36,0.06)",
};

export default function SetupProfile() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill from localStorage if present
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("prepmate_profile") || "null");
      if (saved) {
        setFullName(saved.fullName || "");
        setMobile(saved.mobile || "");
        setEmail(saved.email || "");
        setUsername(saved.username || "");
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const validate = () => {
    if (!fullName.trim()) return "Please enter your full name";
    if (!mobile.trim()) return "Please enter mobile number";
    if (!email.trim()) return "Please enter email address";
    if (!username.trim()) return "Please choose a unique username";
    return null;
  };

  async function handleContinue(e) {
    e?.preventDefault?.();
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    // 1) Save locally
    try {
      localStorage.setItem("prepmate_profile", JSON.stringify({ fullName, mobile, email, username }));
    } catch (err) {
      /* ignore */
    }

    // 2) Optionally: upsert to Supabase 'profiles' table if client available
    if (supabaseClient && typeof supabaseClient.auth?.getUser === "function") {
      try {
        const { data: userData } = await supabaseClient.auth.getUser();
        const user = userData?.user ?? null;
        if (user && user.id) {
          // Try to upsert into `profiles` table — change table name if needed
          const payload = {
            id: user.id,
            full_name: fullName,
            phone: mobile,
            email,
            username,
            updated_at: new Date().toISOString(),
          };
          // best-effort: ignore errors but log to console
          const { error: upsertErr } = await supabaseClient.from("profiles").upsert(payload, { returning: "minimal" });
          if (upsertErr) console.warn("Supabase profile upsert failed:", upsertErr.message || upsertErr);
        }
      } catch (err) {
        console.warn("Supabase attempt failed:", err);
      }
    }

    // short delay to give a smooth UX (you may remove)
    setTimeout(() => {
      setSaving(false);
      // go to generate page
      router.push("/setup-profile-step2");
    }, 500);
  }

  return (
    <>
      <Head>
        <title>Setup profile — PrepMate</title>
        <meta name="description" content="Set up your PrepMate account — enter basic profile details." />
      </Head>

      <div style={{ minHeight: "100vh", background: COLORS.BG, padding: 18, fontFamily: "Inter, system-ui, -apple-system, Arial" }}>
        <div style={{ maxWidth: 720, margin: "18px auto", padding: "0 8px" }}>
          {/* top icon */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#FFFFFF",
              boxShadow: "0 8px 20px rgba(16,24,40,0.06)",
            }}>
              <img src="/prepmate-logo.png" alt="PrepMate logo" style={{ width: 40, height: "auto" }} />
            </div>
          </div>

          <h1 style={{ textAlign: "center", margin: "6px 0", fontSize: 28, color: "#0F1724" }}>Welcome to PrepMate</h1>
          <p style={{ textAlign: "center", color: COLORS.MUTED, marginTop: 6, marginBottom: 18 }}>
            Let's set up your personalized learning experience
          </p>

          {/* Step dots */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 20, background: COLORS.PRIMARY, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>1</div>
            <div style={{ width: 58, height: 6, borderRadius: 6, background: "#E8EEF7" }} />
            <div style={{ width: 34, height: 34, borderRadius: 20, background: "#E8EEF7", color: COLORS.MUTED, display: "flex", alignItems: "center", justifyContent: "center" }}>2</div>
            <div style={{ width: 58, height: 6, borderRadius: 6, background: "#E8EEF7" }} />
            <div style={{ width: 34, height: 34, borderRadius: 20, background: "#E8EEF7", color: COLORS.MUTED, display: "flex", alignItems: "center", justifyContent: "center" }}>3</div>
          </div>

          {/* Card */}
          <div style={{ background: COLORS.CARD, borderRadius: 14, padding: 18, boxShadow: COLORS.SHADOW }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "#F1F8FF", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.PRIMARY }}>
                {/* account icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill={COLORS.PRIMARY}>
                  <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.2c-3.3 0-9.9 1.7-9.9 5v1.7h19.8V19.2c0-3.3-6.6-5-9.9-5z" />
                </svg>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0F1724" }}>Account Information</div>
            </div>

            <form onSubmit={handleContinue}>
              {/* Full name */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", color: "#0F1724", marginBottom: 8 }}>Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(6,14,32,0.06)",
                    background: COLORS.INPUT_BG,
                    fontSize: 15,
                    color: "#0F1724",
                  }}
                />
              </div>

              {/* Mobile */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", color: "#0F1724", marginBottom: 8 }}>Mobile Number</label>
                <input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+91 9876543210"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(6,14,32,0.06)",
                    background: COLORS.INPUT_BG,
                    fontSize: 15,
                    color: "#0F1724",
                  }}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", color: "#0F1724", marginBottom: 8 }}>Email Address</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(6,14,32,0.06)",
                    background: COLORS.INPUT_BG,
                    fontSize: 15,
                    color: "#0F1724",
                  }}
                />
              </div>

              {/* Username */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", color: "#0F1724", marginBottom: 8 }}>Unique Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a unique username"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: "1px solid rgba(6,14,32,0.06)",
                    background: COLORS.INPUT_BG,
                    fontSize: 15,
                    color: "#0F1724",
                  }}
                />
              </div>

            </form>
          </div>

          {/* Bottom actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
            <button
              onClick={() => router.back()}
              style={{
                padding: "12px 18px",
                borderRadius: 10,
                border: "1px solid rgba(6,14,32,0.04)",
                background: "#fff",
                color: COLORS.MUTED,
                minWidth: 120,
                cursor: "pointer"
              }}
            >
              Back
            </button>

            <div style={{ flex: 1 }} />

            <button
              onClick={handleContinue}
              disabled={saving}
              style={{
                padding: "12px 18px",
                borderRadius: 10,
                border: "none",
                background: COLORS.PRIMARY,
                color: "#fff",
                minWidth: 140,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {saving ? "Saving..." : "Continue"}
            </button>
          </div>

          {error && <div style={{ marginTop: 14, color: "#9b2c2c" }}>{error}</div>}
        </div>
      </div>
    </>
  );
}
