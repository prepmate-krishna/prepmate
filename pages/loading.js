// pages/loading.js
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function LoadingPage() {
  const router = useRouter();

  useEffect(() => {
    // redirect to onboarding Step 1 after 5 seconds
    const t = setTimeout(() => {
      router.push("/setup-profile");
    }, 5000);

    return () => clearTimeout(t);
  }, [router]);

  return (
    <>
      <Head>
        <title>Preparing your PrepMate account…</title>
      </Head>

      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#e6fff8",
        padding: 20
      }}>
        <div style={{ textAlign: "center", maxWidth: 640 }}>
          <img src="/prepmate-logo.png" alt="PrepMate" style={{ width: 96, height: "auto", margin: "0 auto 18px", display: "block" }} />
          <h1 style={{ margin: "0 0 8px", fontSize: 26 }}>Welcome to PrepMate</h1>
          <p style={{ color: "#b7f0e6", marginBottom: 22 }}>We’re preparing your personalized onboarding. This will only take a few seconds.</p>

          <div style={{ margin: "18px auto", width: 72, height: 72, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#06202a,#0b3140)" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", border: "4px solid rgba(255,255,255,0.06)", borderTopColor: "#40E0D0", animation: "spin 1s linear infinite" }} />
          </div>

          <p style={{ color: "#9ee9db", marginTop: 8 }}>Getting your account ready…</p>

          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    </>
  );
}
