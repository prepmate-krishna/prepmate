// pages/elite-dashboard.js
import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "../lib/supabase";

export default function EliteDashboard() {
  const router = useRouter();
  const [username, setUsername] = useState("student");
  const [streak, setStreak] = useState(0);
  const [testsTaken, setTestsTaken] = useState(0);
  const [accuracy, setAccuracy] = useState("—");
  const [loading, setLoading] = useState(true);

  // get current user from Supabase (works with v1 and v2)
  async function getCurrentUser() {
    try {
      if (!supabase) return null;
      // supabase v2
      if (supabase.auth && typeof supabase.auth.getSession === "function") {
        const r = await supabase.auth.getSession();
        // r.data.session may be null
        const session = r?.data?.session ?? null;
        return session?.user ?? null;
      }
      // supabase v1
      if (supabase.auth && typeof supabase.auth.session === "function") {
        const session = supabase.auth.session();
        return session?.user ?? null;
      }
    } catch (err) {
      console.error("getCurrentUser error:", err);
    }
    return null;
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const user = await getCurrentUser();
      if (user && mounted) {
        // prefer full name / name metadata, fallback to email prefix or id
        const meta = user.user_metadata ?? user.user_metadata ?? {};
        const name =
          meta.full_name || meta.name || user.email?.split?.("@")?.[0] || user.user_metadata?.full_name || user.id;
        setUsername(name);
        // Optionally fetch stats from your DB (user_stats table). If not available, keep defaults.
        try {
          const { data, error } = await supabase
            .from("user_stats")
            .select("streak,tests_taken,accuracy")
            .eq("user_id", user.id)
            .single();
          if (!error && data) {
            setStreak(data.streak ?? 0);
            setTestsTaken(data.tests_taken ?? 0);
            setAccuracy(typeof data.accuracy !== "undefined" ? `${data.accuracy}%` : "—");
          }
        } catch (err) {
          // ignore DB errors for now
          console.warn("Could not load user stats:", err);
        }
      } else {
        // no user — show anonymous but still usable (you may want to redirect to /auth)
        setUsername("student");
      }
      setLoading(false);
    })();

    // listen for auth changes (optional)
    const sub = supabase?.auth?.onAuthStateChange?.((_event, session) => {
      const u = session?.user ?? null;
      if (u) {
        const m = u.user_metadata ?? {};
        const name = m.full_name || m.name || u.email?.split?.("@")?.[0] || u.id;
        setUsername(name);
      } else {
        setUsername("student");
      }
    });

    return () => {
      if (sub && sub?.subscription?.unsubscribe) sub.subscription.unsubscribe();
      mounted = false;
    };
  }, []);

  function goToGenerate() {
    router.push("/generate");
  }
  function goToUpload() {
    router.push("/upload");
  }
  function goToReports() {
    router.push("/my-reports");
  }
  function goToPlans() {
    router.push("/plans");
  }
  function manageSubscription() {
    router.push("/my-reports"); // replace with subscription page if you have one
  }

  return (
    <>
      <Head>
        <title>Elite Dashboard — PrepMate</title>
      </Head>

      <div className="page">
        <h1 className="title">
          Hi, <span style={{ fontWeight: 800 }}>{username}</span> <span className="crown">👑</span>
        </h1>

        <div className="grid">
          {/* Stats */}
          <div className="card stat">
            <p>Current Streak</p>
            <h2>{loading ? "—" : String(streak)}</h2>
          </div>

          <div className="card stat">
            <p>Tests Taken</p>
            <h2>{loading ? "—" : String(testsTaken)}</h2>
          </div>

          <div className="card stat">
            <p>Accuracy</p>
            <h2>{loading ? "—" : accuracy}</h2>
          </div>

          <div className="card stat">
            <p>Rank</p>
            <h2>🏆</h2>
          </div>

          {/* Left column */}
          <div className="card wide">
            <h3>📘 Smart Weakness Heatmap</h3>
            <p>Advanced interactive version — click to open</p>
            <div style={{ marginTop: 10 }}>
              <button onClick={() => router.push("/my-reports")}>Open Heatmap</button>
            </div>
          </div>

          <div className="card wide">
            <h3>📓 Elite Error Notebook</h3>
            <p>AI-summarized mistakes with solutions</p>
            <input type="text" placeholder="Ask study-related doubts..." />
          </div>

          <div className="card wide">
            <h3>📅 Adaptive Revision Planner</h3>
            <p>Daily + weekly AI schedule</p>
            <div style={{ marginTop: 10 }}>
              <button onClick={() => router.push("/plans")}>Open Planner</button>
            </div>
          </div>

          {/* Right column */}
          <div className="card wide">
            <h3>🤖 AI Explanations for Wrong Answers</h3>
            <button onClick={() => router.push("/my-reports")}>View Explanations</button>
          </div>

          <div className="card wide">
            <h3>🗓 Weekly Automated Tests</h3>
            <p>Auto-generated every week</p>
          </div>

          <div className="card wide">
            <h3>📆 Monthly Test Schedules</h3>
            <p>Plan your monthly practice</p>
          </div>

          <div className="card wide">
            <h3>💬 Priority Support</h3>
            <p>24/7 chat support for Elite members</p>
          </div>

          <div className="card wide">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={goToPlans}>Upgrade/Downgrade Plan</button>
              <button onClick={manageSubscription}>Manage Subscription</button>
              <button onClick={goToUpload}>Upload Study Material</button>
              <button onClick={goToGenerate}>Generate Test</button>
              <button onClick={goToReports}>View Reports</button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: radial-gradient(circle at top left, #0a0f1f, #000);
          padding: 40px;
          color: #fff;
        }
        .title {
          font-size: 32px;
          margin-bottom: 20px;
        }
        .crown {
          font-size: 28px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .card {
          background: linear-gradient(145deg, #101528, #0a0d1a);
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
        }
        .card h3 {
          margin: 0 0 6px;
        }
        .stat {
          text-align: center;
        }
        .stat h2 {
          font-size: 28px;
          margin-top: 6px;
        }
        .wide {
          grid-column: span 2;
        }
        input {
          width: 100%;
          margin-top: 8px;
          padding: 8px;
          border-radius: 8px;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        button {
          margin-top: 8px;
          padding: 10px 14px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          background: linear-gradient(90deg, #2563eb, #06b6d4);
          color: #fff;
          font-weight: 600;
        }
        button + button {
          margin-left: 8px;
          background: rgba(255, 255, 255, 0.1);
        }
        @media (max-width: 1024px) {
          .grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .wide {
            grid-column: span 2;
          }
        }
        @media (max-width: 640px) {
          .grid {
            grid-template-columns: 1fr;
          }
          .wide {
            grid-column: span 1;
          }
        }
      `}</style>
    </>
  );
}
