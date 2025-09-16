// pages/setup-profile-step2.js
import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

// best-effort import supabase client (works if you have lib/supabase exporting supabaseClient)
let supabaseClient = null;
try {
  supabaseClient = require("../lib/supabase").supabaseClient ?? require("../lib/supabase").default ?? null;
} catch (e) {
  supabaseClient = null;
}

const COLORS = {
  BG: "#F6F8FA",
  CARD: "#FFFFFF",
  PRIMARY: "#7EA6FF", // soft blue like your screenshot
  MUTED: "#64748B",
  INPUT_BG: "#FBFDFF",
  SHADOW: "0 12px 30px rgba(15,23,36,0.06)",
};

const EXAMS = [
  "JEE Main", "JEE Advanced", "NEET", "AIIMS", "BITSAT", "CUET", "NATA",
  "UPSC (Civil Services)", "State PSC (e.g. UPPSC, MPSC, MPPSC)", "SSC CGL", "SSC CHSL",
  "Railway RRB", "Banking (SBI PO/Clerk, IBPS PO/Clerk, RRB)", "IBPS RRB",
  "GATE", "IES", "NDA", "NDA (II)", "AFCAT", "NDA (University entry)", "CDS",
  "CAT", "XAT", "CMAT", "NMAT", "IIFT", "SNAP", "MAT",
  "CLAT", "AILET", "NIFT", "NDA", "Law Entrance (State-level)",
  "CA Foundation", "CS Foundation", "ICWA / CMA",
  "CBSE Board (Class 10/12)", "ICSE Board (Class 10/12)", "State Boards (10/12)",
  "IB Diploma", "Cambridge IGCSE", "International (SAT, ACT)", "GRE", "GMAT",
  "Teaching (CTET, TET)", "Defense (AFCAT, NDA, CDS)", "Police (State Police)", 
  "SSC JE", "SSC Stenographer", "SSC MTS",
  "PSC (State Public Service)", "UP Police", "State Teacher Exams",
  "Nursing Entrance", "Pharmacy Entrance (GPAT)", "Architecture (NATA)",
  "Hotel Management (NCHM)", "Design (UCEED)", "Law (CLAT)", "Medical (NEET PG)",
  "MBA (Various)", "Engineering (Various)", "Diploma Exams",
  "Karnataka CET", "MH CET", "WBJEE", "AP EAMCET", "TS EAMCET",
  "Bank PO - Specialist", "SSC CPO",
  "Other / Not Listed"
];

export default function Step2SelectExam() {
  const router = useRouter();
  const [selectedExam, setSelectedExam] = useState("");
  const [openDropdown, setOpenDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // load previously chosen values if any
    try {
      const saved = JSON.parse(localStorage.getItem("prepmate_profile") || "null");
      if (saved && saved.selectedExam) {
        setSelectedExam(saved.selectedExam);
      }
    } catch (e) { /* ignore */ }
  }, []);

  async function saveAndContinue() {
    setError("");
    if (!selectedExam) {
      setError("Please choose the exam you're preparing for.");
      return;
    }
    setSaving(true);

    // Save locally
    try {
      const prev = JSON.parse(localStorage.getItem("prepmate_profile") || "{}");
      const merged = { ...prev, selectedExam };
      localStorage.setItem("prepmate_profile", JSON.stringify(merged));
    } catch (e) {
      console.warn("Local storage save failed", e);
    }

    // Try to upsert to Supabase 'profiles' table if client exists and user signed in
    if (supabaseClient && typeof supabaseClient.auth?.getUser === "function") {
      try {
        const { data: userData } = await supabaseClient.auth.getUser();
        const user = userData?.user ?? null;
        if (user && user.id) {
          const payload = {
            id: user.id,
            preferred_exam: selectedExam,
            updated_at: new Date().toISOString()
          };
          const { error: upsertErr } = await supabaseClient.from("profiles").upsert(payload, { returning: "minimal" });
          if (upsertErr) console.warn("Supabase upsert error:", upsertErr.message ?? upsertErr);
        }
      } catch (e) {
        console.warn("Supabase write failed (ignored):", e);
      }
    }

    // small delay for UX
    setTimeout(() => {
      setSaving(false);
      // Next: redirect to generate or step 3 if you implement
      router.push("/generate");
    }, 400);
  }

  function toggleDropdown() {
    setOpenDropdown(!openDropdown);
  }

  function chooseExam(exam) {
    setSelectedExam(exam);
    setOpenDropdown(false);
  }

  return (
    <>
      <Head>
        <title>Choose your exam — PrepMate</title>
      </Head>

      <div style={{ minHeight: "100vh", background: COLORS.BG, padding: 18, fontFamily: "Inter, system-ui, -apple-system, Arial" }}>
        <div style={{ maxWidth: 720, margin: "12px auto", padding: "0 8px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center",
              background: "#FFFFFF", boxShadow: "0 8px 20px rgba(16,24,40,0.06)"
            }}>
              <img src="/prepmate-logo.png" alt="logo" style={{ width: 40, height: "auto" }} />
            </div>
          </div>

          <h1 style={{ textAlign: "center", margin: "6px 0", fontSize: 26, color: "#0F1724" }}>Welcome to PrepMate</h1>
          <p style={{ textAlign: "center", color: COLORS.MUTED, marginTop: 6, marginBottom: 18 }}>
            Let's set up your personalized learning experience
          </p>

          {/* Steps */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 20, background: "#E8F4FF", color: COLORS.PRIMARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ✓
            </div>
            <div style={{ width: 58, height: 6, borderRadius: 6, background: "#E8EEF7" }} />
            <div style={{ width: 34, height: 34, borderRadius: 20, background: COLORS.PRIMARY, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              2
            </div>
            <div style={{ width: 58, height: 6, borderRadius: 6, background: "#E8EEF7" }} />
            <div style={{ width: 34, height: 34, borderRadius: 20, background: "#E8EEF7", color: COLORS.MUTED, display: "flex", alignItems: "center", justifyContent: "center" }}>
              3
            </div>
          </div>

          {/* Card */}
          <div style={{ background: COLORS.CARD, borderRadius: 14, padding: 18, boxShadow: COLORS.SHADOW }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "#F1FBF6", display: "flex", alignItems: "center", justifyContent: "center", color: "#06A55A" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#06A55A" aria-hidden>
                  <path d="M12 3L2 9l10 6 10-6-10-6zM2 15v6l10 6 10-6v-6" />
                </svg>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0F1724" }}>Select Your Exam</div>
            </div>

            <div style={{ marginTop: 6 }}>
              <label style={{ display: "block", color: COLORS.MUTED, marginBottom: 8 }}>Choose the exam you're preparing for</label>

              {/* styled dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={toggleDropdown}
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 8,
                    background: COLORS.INPUT_BG,
                    textAlign: "left",
                    border: "1px solid rgba(6,14,32,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 15,
                    color: selectedExam ? "#0F1724" : "#9AA0A6",
                  }}
                >
                  <span>{selectedExam || "Choose the exam you're preparing for"}</span>
                  <span style={{ transform: openDropdown ? "rotate(180deg)" : "rotate(0deg)", transition: "200ms" }}>▾</span>
                </button>

                {openDropdown && (
                  <div role="listbox" tabIndex={-1} style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "calc(100% + 10px)",
                    maxHeight: 320,
                    overflowY: "auto",
                    background: "#fff",
                    borderRadius: 8,
                    boxShadow: "0 12px 30px rgba(10,20,40,0.08)",
                    zIndex: 80,
                    padding: 6,
                  }}>
                    {EXAMS.map((exam) => (
                      <div
                        key={exam}
                        role="option"
                        onClick={() => chooseExam(exam)}
                        style={{
                          padding: "14px 12px",
                          borderRadius: 6,
                          cursor: "pointer",
                          color: "#0F1724",
                          fontSize: 15,
                        }}
                      >
                        {exam}
                      </div>
                    ))}

                    {/* quick "Other" field */}
                    <div style={{ padding: 12, borderTop: "1px solid #F1F5F9" }}>
                      <input
                        placeholder="Other: type an exam name"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const txt = e.target.value.trim();
                            if (txt) chooseExam(txt);
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid rgba(6,14,32,0.06)",
                          fontSize: 14,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
            <button
              onClick={() => router.push("/setup-profile")}
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
              onClick={saveAndContinue}
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
