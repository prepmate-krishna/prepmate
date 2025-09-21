// pages/dashboard-prime.js
import { useEffect, useState, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function DashboardPrime() {
  const router = useRouter();
  const fileRef = useRef();

  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("Student");
  const [streak, setStreak] = useState(0);
  const [testsTaken, setTestsTaken] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [reminders, setReminders] = useState(true);

  // Fetch user session + stats
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        const u = data.session.user;
        setUser(u);
        setUsername(u.user_metadata?.full_name || u.email?.split("@")[0]);

        // Fetch stats from Supabase table user_stats
        const { data: stats } = await supabase
          .from("user_stats")
          .select("streak, tests_taken")
          .eq("user_id", u.id)
          .single();

        if (stats) {
          setStreak(stats.streak);
          setTestsTaken(stats.tests_taken);
        }
      } else {
        router.push("/auth");
      }
    })();
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return alert("Please choose a file");

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const resp = await fetch("/api/extract-pdf", { method: "POST", body: form });
      const json = await resp.json();
      sessionStorage.setItem("prepmate_extracted_text", json.text || "");
      router.push("/generate");
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function toggleReminders() {
    setReminders(!reminders);
    if (user) {
      await supabase.from("user_settings").upsert({
        user_id: user.id,
        reminders: !reminders,
      });
    }
  }

  return (
    <>
      <Head>
        <title>PrepMate — Prime Dashboard</title>
      </Head>
      <div className="page">
        <h1>Hi, {username} 👋</h1>

        <div className="grid">
          {/* Stats */}
          <Card title="Current Streak" value={streak} icon="🔥" color="red" />
          <Card title="Tests Taken" value={testsTaken} icon="✅" color="green" />

          {/* Upload / Generate */}
          <div className="card wide">
            <h3>Upload & Generate Tests</h3>
            <form onSubmit={handleUpload}>
              <input ref={fileRef} type="file" accept="application/pdf" />
              <button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "AI Generate"}
              </button>
            </form>
          </div>

          {/* Prime-only */}
          <div className="card wide">
            <h3>NEW PRIME-ONLY FEATURES</h3>
            <div className="feature">
              🤖 AI Explanations for Wrong Answers
              <button onClick={() => router.push("/ai-explanations")}>View Explanations</button>
            </div>
            <div className="feature">
              📅 Weekly Automated Tests <br />
              <small>Next Test: Sunday 9 AM</small>
            </div>
            <div className="feature">🗓️ Monthly Test Schedules</div>
          </div>

          {/* Weakness Heatmap + Notebook */}
          <div className="card">
            <h3>Weakness Heatmap</h3>
            <button onClick={() => router.push("/heatmap")}>Open</button>
          </div>
          <div className="card">
            <h3>Error Notebook</h3>
            <button onClick={() => router.push("/notebook")}>Open</button>
          </div>

          {/* Reminder Toggle */}
          <div className="card wide">
            <h3>📲 WhatsApp / Email Reminders</h3>
            <label>
              <input type="checkbox" checked={reminders} onChange={toggleReminders} /> Enabled
            </label>
          </div>
        </div>

        <style jsx>{`
          .page {
            background: #111;
            color: #fff;
            min-height: 100vh;
            padding: 20px;
            font-family: Inter, sans-serif;
          }
          h1 {
            font-size: 28px;
            margin-bottom: 20px;
          }
          .grid {
            display: grid;
            gap: 16px;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          }
          .card {
            background: #1c1c1c;
            padding: 16px;
            border-radius: 10px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .wide {
            grid-column: span 2;
          }
          .feature {
            margin: 10px 0;
            padding: 8px;
            border-bottom: 1px solid #333;
          }
          button {
            margin-top: 8px;
            padding: 8px 12px;
            border: none;
            background: #2563eb;
            color: #fff;
            border-radius: 6px;
            cursor: pointer;
          }
          input[type="file"] {
            margin: 10px 0;
          }
        `}</style>
      </div>
    </>
  );
}

function Card({ title, value, icon }) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{icon} {title}</span>
        <strong>{value}</strong>
      </div>
      <style jsx>{`
        .card {
          background: #1c1c1c;
          padding: 16px;
          border-radius: 10px;
        }
        strong {
          font-size: 22px;
        }
      `}</style>
    </div>
  );
}
