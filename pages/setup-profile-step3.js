// pages/setup-profile-step3.js
import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "../lib/supabase";

/**
 * Plan list
 */
const PLANS = [
  {
    id: "free",
    title: "Free Plan",
    priceLabel: "Free",
    priceValue: 0,
    features: ["5 AI-Generated Tests / month (beta limit)"],
    accent: "#6B7280",
    note: "Try PrepMate — no cost, limited tests.",
  },
  {
    id: "starter",
    title: "Starter",
    priceLabel: "₹299 / month",
    priceValue: 299,
    features: [
      "Unlimited AI Test Generator (subject + chapter + difficulty)",
      "Weakness Heatmap (color-coded insights)",
      "Error Notebook (AI flashcards of mistakes)",
      "Smart Revision Planner (forgetting curve reminders)",
      "Daily Streaks & Rewards",
    ],
    accent: "#2B95F6",
  },
  {
    id: "career-counseling",
    title: "Career Counseling",
    priceLabel: "₹99 (one-time)",
    priceValue: 99,
    features: [
      "AI-powered career analysis (one-time)",
      "Downloadable roadmap PDF",
      "One-time assessment",
    ],
    accent: "#D97706",
  },
  {
    id: "prime",
    title: "Prime",
    priceLabel: "₹399 / month",
    priceValue: 399,
    recommended: true,
    features: [
      "Everything in Starter",
      "Increased upload storage",
      "AI Explanations for wrong answers",
      "Weekly Automated Tests",
      "Monthly Test Schedules",
      "WhatsApp / Email Reminders",
      "Adaptive Revision Planner",
    ],
    accent: "#00C48C",
  },
  {
    id: "elite",
    title: "Elite",
    priceLabel: "₹499 / month",
    priceValue: 499,
    features: [
      "Everything in Prime",
      "Unlimited AI Mentor (chat) - beta",
      "Performance Prediction Engine",
      "Peer Battles & Leaderboards",
      "Parent/Coach Dashboard (beta)",
      "Priority Support",
    ],
    accent: "#8A63FF",
  },
];

export default function SetupProfileStep3() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("prepmate_selected_plan");
      if (saved) setSelectedPlan(saved);
    } catch (e) {}
  }, []);

  function choosePlan(id) {
    setSelectedPlan(id);
  }

  // session getter
  async function getCurrentUser() {
    try {
      if (!supabase) return null;
      if (supabase.auth && typeof supabase.auth.getSession === "function") {
        const r = await supabase.auth.getSession();
        const session = r?.data?.session ?? null;
        return session?.user ?? null;
      }
      if (supabase.auth && typeof supabase.auth.session === "function") {
        const session = supabase.auth.session();
        return session?.user ?? null;
      }
    } catch (err) {
      console.error("getCurrentUser error:", err);
    }
    return null;
  }

  // server persistence with token handling
  async function persistPlanToServer(planId, priceValue) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const resp = await fetch("/api/save-selected-plan", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`, // ✅ pass token
        },
        body: JSON.stringify({ plan: planId, priceValue }),
      });

      let json;
      try {
        json = await resp.json();
      } catch (e) {
        throw new Error(`Server returned non-JSON (status ${resp.status})`);
      }

      if (!resp.ok) {
        const errMsg = json?.error || `Save failed (status ${resp.status})`;
        throw new Error(errMsg);
      }
      return json;
    } catch (err) {
      console.error("persistPlanToServer error:", err);
      throw err;
    }
  }

  // main handler
  async function handleComplete() {
    if (!selectedPlan) {
      alert("Please select a plan.");
      return;
    }

    setSaving(true);

    try {
      localStorage.setItem("prepmate_selected_plan", selectedPlan);
    } catch (e) {}

    const user = await getCurrentUser();
    if (!user) {
      setSaving(false);
      if (confirm("You need to be signed in to save your plan. Go to Sign in?")) {
        router.push("/auth");
      }
      return;
    }

    const planObj = PLANS.find((p) => p.id === selectedPlan);

    try {
      await persistPlanToServer(selectedPlan, planObj?.priceValue ?? null);
    } catch (e) {
      setSaving(false);
      alert("Failed saving plan: " + (e?.message || "Unknown error"));
      return;
    }

    setSaving(false);

    if (selectedPlan === "free") {
      router.push("/generate");
      return;
    }

    if (selectedPlan === "career-counseling") {
      router.push("/career-counseling?plan=career-counseling");
      return;
    }

    router.push("/payment?plan=" + encodeURIComponent(selectedPlan));
  }

  function handleBack() {
    router.back();
  }

  return (
    <>
      <Head>
        <title>Choose a plan — PrepMate</title>
      </Head>

      <div style={{ minHeight: "100vh", background: "#F7FBFD", paddingBottom: 60 }}>
        <header style={{ background: "#fff", borderBottom: "1px solid rgba(15,23,36,0.04)" }}>
          <div style={{ maxWidth: 920, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/prepmate-logo.png" alt="logo" style={{ width: 36, height: "auto" }} />
            <h1 style={{ margin: 0, fontSize: 18 }}>PrepMate</h1>
          </div>
        </header>

        <main style={{ maxWidth: 920, margin: "28px auto", padding: "0 16px" }}>
          <section style={{ textAlign: "center", marginBottom: 18 }}>
            <h2 style={{ margin: "6px 0 8px", fontSize: 26 }}>Choose your plan</h2>
            <p style={{ margin: 0, color: "#475569" }}>
              Pick a plan that fits your preparation needs. You can change later.
            </p>
          </section>

          <section style={{ display: "grid", gap: 16 }}>
            {PLANS.map((p) => {
              const selected = p.id === selectedPlan;
              return (
                <div
                  key={p.id}
                  onClick={() => choosePlan(p.id)}
                  role="button"
                  tabIndex={0}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    padding: 18,
                    boxShadow: selected
                      ? "0 12px 32px rgba(2,6,23,0.08)"
                      : "0 6px 18px rgba(11,20,40,0.04)",
                    border: selected
                      ? `2px solid ${p.accent}`
                      : "1px solid rgba(15,23,36,0.06)",
                    cursor: "pointer",
                    transition: "transform .12s ease",
                    transform: selected ? "translateY(-4px)" : "none",
                    position: "relative",
                  }}
                >
                  {p.recommended && (
                    <div
                      style={{
                        position: "absolute",
                        left: 14,
                        top: -10,
                        background: "#00C48C",
                        color: "#fff",
                        padding: "6px 10px",
                        borderRadius: 14,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Recommended
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{p.title}</div>
                      <div
                        style={{
                          marginTop: 6,
                          color: p.priceValue === 0 ? "#0f1724" : "#94a3b8",
                          fontWeight: 700,
                        }}
                      >
                        {p.priceLabel}
                      </div>
                      {p.note && (
                        <div style={{ marginTop: 8, color: "#475569", fontSize: 13 }}>
                          {p.note}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 18,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: selected
                          ? `3px solid ${p.accent}`
                          : "2px solid rgba(15,23,36,0.08)",
                        color: selected ? p.accent : "#c7d2da",
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      {selected ? "✓" : ""}
                    </div>
                  </div>

                  <ul
                    style={{
                      marginTop: 12,
                      paddingLeft: 18,
                      color: "#334155",
                      lineHeight: 1.7,
                    }}
                  >
                    {p.features.map((f, i) => (
                      <li
                        key={i}
                        style={{
                          listStyle: "none",
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          style={{ flex: "0 0 16px" }}
                        >
                          <path
                            d="M20 6L9 17l-5-5"
                            stroke="#00C48C"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span style={{ fontSize: 14 }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 20,
            }}
          >
            <button
              onClick={handleBack}
              style={{
                padding: "12px 18px",
                borderRadius: 10,
                background: "#fff",
                border: "1px solid rgba(15,23,36,0.06)",
                cursor: "pointer",
                minWidth: 120,
                fontWeight: 700,
              }}
            >
              Back
            </button>

            <div style={{ flex: 1 }} />

            <button
              onClick={handleComplete}
              disabled={saving}
              style={{
                padding: "12px 20px",
                borderRadius: 10,
                background:
                  selectedPlan === "prime" ? "#00C48C" : "#1266d6",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                minWidth: 160,
                fontWeight: 800,
                boxShadow: "0 10px 30px rgba(2,6,23,0.08)",
              }}
            >
              {saving
                ? "Saving..."
                : selectedPlan === "free"
                ? "Complete (Free)"
                : selectedPlan === "career-counseling"
                ? "Proceed"
                : "Proceed to Payment"}
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
