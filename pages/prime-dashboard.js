import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "../lib/supabase";

export default function PrimeDashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        if (!supabase) return;
        if (supabase.auth && typeof supabase.auth.getSession === "function") {
          const r = await supabase.auth.getSession();
          setUserId(r?.data?.session?.user?.id ?? null);
        } else if (supabase.auth && typeof supabase.auth.session === "function") {
          const s = supabase.auth.session();
          setUserId(s?.user?.id ?? null);
        }
      } catch (err) {
        console.error("PrimeDashboard get session error:", err);
      }
    })();
  }, []);

  return (
    <>
      <Head><title>Prime Dashboard — PrepMate</title></Head>
      <div style={{ minHeight: "100vh", padding: 28, background: "#F7FBFD" }}>
        <main style={{ maxWidth: 920, margin: "0 auto", background: "#fff", padding: 24, borderRadius: 12 }}>
          <h1 style={{ marginTop: 0 }}>Prime Plan Dashboard</h1>
          <p>Welcome to the Prime plan area.</p>
          <p><strong>Plan:</strong> Prime (₹399 / month)</p>
          <p><strong>User ID:</strong> {userId ?? "Not signed in"}</p>

          <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
            <button onClick={() => router.push("/generate")} style={{ padding: "10px 14px", borderRadius: 8 }}>Go to Generate</button>
            <button onClick={() => router.push("/")} style={{ padding: "10px 14px", borderRadius: 8 }}>Home</button>
          </div>
        </main>
      </div>
    </>
  );
}
