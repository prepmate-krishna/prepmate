// components/AuthClient.js
import { useState } from "react";
import Head from "next/head";
import { supabaseClient } from "../lib/supabase"; // must exist

// styling tokens
const TIF = "#0ABAB5";
const BG = "#000000";
const CARD = "#071014";
const MUTED = "#84ccc6";
const INPUT_BG = "#020405";

export default function AuthClient() {
  const [mode, setMode] = useState("login"); // login | signup | magic
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleSignup(e) {
    e?.preventDefault?.();
    setMsg(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signUp({
        email: email.trim(),
        password: password || undefined,
      });
      if (error) throw error;
      setMsg({ type: "success", text: "Signup initiated — check your email." });
      setEmail("");
      setPassword("");
    } catch (err) {
      setMsg({ type: "error", text: err.message || String(err) });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e?.preventDefault?.();
    setMsg(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      setMsg({ type: "success", text: "Signed in successfully. Redirecting…" });
      window.location.href = "/generate";
    } catch (err) {
      setMsg({ type: "error", text: err.message || String(err) });
    } finally {
      setLoading(false);
    }
  }

  async function handleMagic(e) {
    e?.preventDefault?.();
    setMsg(null);
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOtp({
        email: email.trim(),
      });
      if (error) throw error;
      setMsg({ type: "success", text: "Magic link sent — check your email." });
      setEmail("");
    } catch (err) {
      setMsg({ type: "error", text: err.message || String(err) });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignout() {
    setLoading(true);
    await supabaseClient.auth.signOut();
    setMsg({ type: "success", text: "Signed out" });
    setLoading(false);
    window.location.href = "/";
  }

  function signInWithProvider(provider) {
    supabaseClient.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/generate` },
    });
  }

  return (
    <div style={{ background: BG, color: TIF, minHeight: "100vh", padding: 24, fontFamily: "Inter, system-ui, -apple-system" }}>
      <Head><title>Auth — PrepMate</title></Head>

      <div style={{ maxWidth: 760, margin: "30px auto", display: "grid", gap: 16 }}>
        <div style={{ background: CARD, padding: 18, borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/prepmate-logo.png" alt="PrepMate" style={{ width: 56, height: "auto" }} />
            <div>
              <h2 style={{ margin: 0, color: TIF }}>PrepMate Account</h2>
              <div style={{ color: MUTED, fontSize: 13 }}>Sign up or log in to save tests and reports.</div>
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button onClick={() => setMode("login")} style={{ padding: "6px 10px", borderRadius: 8, background: "transparent", color: TIF, border: "1px solid #083030" }}>Login</button>
              <button onClick={() => setMode("signup")} style={{ padding: "6px 10px", borderRadius: 8, background: TIF, color: "#001010", border: "none" }}>Sign up</button>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => setMode("login")} disabled={mode === "login"} style={{ padding: "8px 12px", borderRadius: 8, background: mode === "login" ? TIF : "transparent", color: mode === "login" ? "#001010" : TIF }}>Email + Password</button>
              <button onClick={() => setMode("magic")} disabled={mode === "magic"} style={{ padding: "8px 12px", borderRadius: 8, background: mode === "magic" ? TIF : "transparent", color: mode === "magic" ? "#001010" : TIF }}>Magic Link</button>
            </div>

            {msg && (
              <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: msg.type === "error" ? "#341313" : "#10221f", color: msg.type === "error" ? "#ff8b8b" : MUTED }}>
                {msg.text}
              </div>
            )}

            <form onSubmit={mode === "signup" ? handleSignup : mode === "magic" ? handleMagic : handleLogin}>
              <label style={{ display: "block", marginBottom: 8 }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${MUTED}`, background: INPUT_BG, color: TIF }} required />

              {mode !== "magic" && (
                <>
                  <label style={{ display: "block", marginTop: 12, marginBottom: 8 }}>Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a strong password" style={{ width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${MUTED}`, background: INPUT_BG, color: TIF }} required={mode !== "magic"} />
                </>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button type="submit" disabled={loading} style={{ background: TIF, color: "#001010", padding: "10px 14px", borderRadius: 8, border: "none" }}>
                  {loading ? "Processing..." : mode === "signup" ? "Create account" : mode === "magic" ? "Send magic link" : "Sign in"}
                </button>
                <button type="button" onClick={() => { setEmail(""); setPassword(""); setMsg(null); }} style={{ background: "transparent", color: TIF, border: `1px solid ${MUTED}`, padding: "10px 12px", borderRadius: 8 }}>Clear</button>
                <button type="button" onClick={handleSignout} style={{ marginLeft: "auto", background: "#022426", color: TIF, border: `1px solid ${MUTED}`, padding: "10px 12px", borderRadius: 8 }}>Sign out</button>
              </div>
            </form>

            <div style={{ marginTop: 18 }}>
              <div style={{ color: MUTED, marginBottom: 8 }}>Or sign in with:</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => signInWithProvider("google")} style={{ padding: "8px 12px", borderRadius: 8, background: "#DB4437", color: "#fff", border: "none" }}>Continue with Google</button>
                <button onClick={() => signInWithProvider("github")} style={{ padding: "8px 12px", borderRadius: 8, background: "#24292e", color: "#fff", border: "none" }}>Continue with GitHub</button>
                <button onClick={() => signInWithProvider("apple")} style={{ padding: "8px 12px", borderRadius: 8, background: "#000", color: "#fff", border: "1px solid #333" }}>Continue with Apple</button>
              </div>
              <div style={{ marginTop: 8, color: MUTED, fontSize: 12 }}>
                Note: OAuth providers must be configured in your Supabase project (Auth → Providers). Make sure redirect URLs include this domain.
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: CARD, padding: 14, borderRadius: 12, color: MUTED }}>
          <strong>Supabase auth is used:</strong> users are created in your Supabase project. Make sure your project's <em>Authentication → Settings</em> allows email signups and that the site URL (redirect) includes this domain.
        </div>
      </div>
    </div>
  );
}
