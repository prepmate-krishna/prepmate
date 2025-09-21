// pages/payment.js
import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import supabase from "../lib/supabase";

export default function PaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const qPlan = Array.isArray(router.query.plan) ? router.query.plan[0] : router.query.plan;
    const saved = (() => {
      try { return localStorage.getItem("prepmate_selected_plan"); } catch (e) { return null; }
    })();
    if (qPlan) setPlan(qPlan);
    else if (saved) setPlan(saved);
    else setPlan("starter");
  }, [router.query]);

  async function getCurrentUserId() {
    try {
      if (!supabase) return null;
      if (supabase.auth && typeof supabase.auth.getSession === "function") {
        const r = await supabase.auth.getSession();
        return r?.data?.session?.user?.id ?? null;
      }
      if (supabase.auth && typeof supabase.auth.session === "function") {
        const s = supabase.auth.session();
        return s?.user?.id ?? null;
      }
    } catch (err) {
      console.error("getCurrentUserId error:", err);
    }
    return null;
  }

  async function handleCompletePayment() {
    setError(null);
    setLoading(true);

    const userId = await getCurrentUserId();
    if (!userId) {
      setLoading(false);
      if (confirm("You must sign in to complete purchase. Go to Sign in?")) router.push("/auth");
      return;
    }

    try {
      const resp = await fetch("/api/save-selected-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          plan: plan || "starter",
          priceValue: plan === "starter" ? 299 : plan === "prime" ? 399 : 499
        }),
      });

      const text = await resp.text();
      let json = null;
      try { json = JSON.parse(text); } catch (e) {
        console.warn("Server returned non-JSON response:", text);
      }

      if (!resp.ok) {
        console.error("save-selected-plan failed", resp.status, json ?? text);
        setError(json?.error || `Server returned status ${resp.status}`);
        setLoading(false);
        return;
      }

      console.log("save-selected-plan success:", json ?? text);

      // redirect based on plan
      if (plan === "starter") router.push("/starter-dashboard");
      else if (plan === "prime") router.push("/prime-dashboard");
      else if (plan === "ultimate") router.push("/ultimate-dashboard");
      else router.push("/generate"); // fallback
    } catch (err) {
      console.error("handleCompletePayment error:", err);
      setError(err.message || String(err));
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Payment — PrepMate</title>
      </Head>

      <div style={{ minHeight: "100vh", background: "#F7FBFD", padding: 32 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", background: "#fff", padding: 28, borderRadius: 12 }}>
          <h1 style={{ marginTop: 0 }}>Mock Payment / Complete Purchase</h1>

          <p style={{ color: "#334155" }}>
            Subscribing to plan: <strong>{plan}</strong>
          </p>

          <div style={{ margin: "18px 0" }}>
            <button
              onClick={handleCompletePayment}
              disabled={loading}
              style={{
                background: "#1266d6",
                color: "#fff",
                border: "none",
                padding: "12px 18px",
                borderRadius: 10,
                fontWeight: 700,
                cursor: loading ? "default" : "pointer"
              }}
            >
              {loading ? "Processing..." : "Complete Payment (Mock)"}
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 12, color: "#b91c1c", background: "#ffeeee", padding: 10, borderRadius: 8 }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          <div style={{ marginTop: 18, color: "#475569", fontSize: 13 }}>
            Tip: If you see a server error, check the terminal (`npm run dev`) and DevTools → Network tab.
          </div>
        </div>
      </div>
    </>
  );
}
