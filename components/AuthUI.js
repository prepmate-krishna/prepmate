// components/AuthUI.js
import React, { useState } from "react";
import { supabaseClient } from "../lib/supabase"; // ensure this exists and exports supabaseClient

const COLORS = {
  BG: "#F6F8FA",
  CARD: "#FFFFFF",
  PRIMARY: "#0B66FF",
  PRIMARY_DARK: "#081B3A",
  MUTED: "#64748B",
  INPUT_BG: "#FBFDFF",
  SHADOW: "0 10px 30px rgba(15,23,36,0.06)",
};

function IconGoogle() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.9 0 6.6 1.7 8.1 3.1l6-5.8C34.9 3.6 30.9 2 24 2 14.6 2 6.9 7.2 3.4 15.2l7.2 5.6C12.2 14 17.6 9.5 24 9.5z"/>
      <path fill="#34A853" d="M46.5 24c0-1.6-.1-2.8-.5-4H24v8.2h12.6c-.6 3.4-2.9 6.2-6 8.1l7.4 5.7C43.8 36.3 46.5 30.6 46.5 24z"/>
      <path fill="#4A90E2" d="M10.6 28.8a14.5 14.5 0 010-9.6L3.4 13.6A24 24 0 0024 46c6.2 0 11.8-2 15.9-5.4l-7.4-5.7c-2 1.3-4.5 2.1-8.5 2.1-6.4 0-11.8-4.5-13.4-10.2z"/>
      <path fill="#FBBC05" d="M24 9.5c3.9 0 6.6 1.7 8.1 3.1l-7.4 5.7c-1.6-2.6-4.9-5-8.9-5-2.4 0-4.6.8-6.4 2.1l-7.2-5.6C6.9 7.2 14.6 2 24 2z"/>
    </svg>
  );
}

export default function AuthUI() {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  async function signInWithGoogle() {
    try {
      setMessage(null);
      await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/loading` }
      });
      // Supabase will redirect
    } catch (err) {
      setMessage({ type: "error", text: err.message || String(err) });
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabaseClient.auth.signUp({ email: email.trim(), password: password || undefined });
      if (error) throw error;
      setMessage({ type: "success", text: "Signup initiated. Check your email for confirmation." });
    } catch (err) {
      setMessage({ type: "error", text: err.message || String(err) });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setMessage({ type: "success", text: "Signed in — redirecting..." });
      window.location.href = "/loading";
    } catch (err) {
      setMessage({ type: "error", text: err.message || String(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: COLORS.CARD,
        borderRadius: 18,
        padding: 28,
        boxShadow: COLORS.SHADOW,
      }}>
        {/* Top icon */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
          <div style={{
            width: 84, height: 84, borderRadius: 42, background: "#FFFFFF",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 6px 18px rgba(10,20,40,0.06)"
          }}>
            <img src="/prepmate-logo.png" alt="logo" style={{ width: 48, height: "auto" }} />
          </div>
        </div>

        <h2 style={{ textAlign: "center", margin: "10px 0 4px 0", color: "#0F1724", fontSize: 24 }}>Welcome to PrepMate</h2>
        <div style={{ textAlign: "center", color: COLORS.MUTED, fontSize: 14, marginBottom: 18 }}>Sign in to continue</div>

        {/* Google button */}
        <button
          onClick={signInWithGoogle}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(15,23,36,0.06)",
            background: "#fff",
            cursor: "pointer",
            marginBottom: 18,
            boxShadow: "inset 0 0 0 1px rgba(10,20,40,0.02)"
          }}
        >
          <div style={{ width: 22, display: "flex", justifyContent: "center" }}><IconGoogle /></div>
          <div style={{ flex: 1, textAlign: "center", color: "#202B3A", fontWeight: 600 }}>Continue with Google</div>
        </button>

        {/* OR divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{ height: 1, background: "rgba(6,14,32,0.04)", flex: 1 }} />
          <div style={{ color: COLORS.MUTED, fontSize: 12 }}>OR</div>
          <div style={{ height: 1, background: "rgba(6,14,32,0.04)", flex: 1 }} />
        </div>

        {/* Form */}
        <form onSubmit={mode === "signup" ? handleSignup : handleLogin}>
          <label style={{ display: "block", color: COLORS.MUTED, fontSize: 13, marginBottom: 8 }}>Email</label>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: COLORS.INPUT_BG,
            borderRadius: 12,
            padding: "10px 12px",
            marginBottom: 14,
            border: "1px solid rgba(6,14,32,0.03)"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#9AA0A6" aria-hidden>
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{ border: "none", outline: "none", flex: 1, background: "transparent", fontSize: 15, color: "#0F1724" }}
            />
          </div>

          <label style={{ display: "block", color: COLORS.MUTED, fontSize: 13, marginBottom: 8 }}>Password</label>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: COLORS.INPUT_BG,
            borderRadius: 12,
            padding: "10px 12px",
            marginBottom: 20,
            border: "1px solid rgba(6,14,32,0.03)"
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#9AA0A6" aria-hidden>
              <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-6V9c0-3.3-2.7-6-6-6S6 5.7 6 9v2H4v10h16V11h-2zm-8 0V9c0-2.2 1.8-4 4-4s4 1.8 4 4v2H10z"/>
            </svg>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ border: "none", outline: "none", flex: 1, background: "transparent", fontSize: 15, color: "#0F1724" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              background: COLORS.PRIMARY_DARK,
              color: "#fff",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            {mode === "signup" ? (loading ? "Creating..." : "Create account") : (loading ? "Signing in..." : "Sign in")}
          </button>
        </form>

        <div style={{ textAlign: "center", color: COLORS.MUTED, fontSize: 13 }}>
          <a href="/forgot" style={{ color: COLORS.MUTED, textDecoration: "none", display: "block", marginBottom: 8 }}>Forgot password?</a>
          <div>
            Need an account?{" "}
            <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} style={{ color: COLORS.PRIMARY, border: "none", background: "transparent", cursor: "pointer", fontWeight: 600 }}>
              {mode === "signup" ? "Back to sign in" : "Sign up"}
            </button>
          </div>
        </div>

        {message && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: message.type === "error" ? "#fff3f2" : "#f0fff7", color: message.type === "error" ? "#9b2c2c" : "#064e3b" }}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
