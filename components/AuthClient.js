// components/AuthClient.js
"use client";

import React, { useState } from "react";
import { supabase } from "../lib/supabase"; // project already has lib/supabase
import { useRouter } from "next/router";

export default function AuthClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Redirect target after successful sign-in (loading page will redirect to setup)
  const redirectTo = `${typeof window !== "undefined" ? window.location.origin : ""}/loading`;

  async function signInWithGoogle() {
    try {
      setLoading(true);
      setMessage(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
      // Supabase will redirect to Google; nothing more to do here
    } catch (err) {
      setMessage(err.message || "Google sign-in failed");
      setLoading(false);
    }
  }

  async function signInWithEmail(e) {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setMessage("Please enter a valid email");
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setMessage("Check your email for a login link (or OTP).");
      setLoading(false);
    } catch (err) {
      setMessage(err.message || "Failed to send login link");
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #e6e9ee",
            background: "#fff",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
          }}
        >
          <img src="/google-icon.png" alt="G" style={{ width: 20, height: 20 }} />
          <span style={{ fontWeight: 600 }}>Continue with Google</span>
        </button>

        <div style={{ textAlign: "center", color: "#8b93a7" }}>OR</div>

        <form onSubmit={signInWithEmail} style={{ display: "grid", gap: 8 }}>
          <label style={{ fontSize: 14, color: "#4b5563" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #e6e9ee",
              outline: "none",
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              padding: "12px 14px",
              borderRadius: 8,
              border: "none",
              background: "#0b63f6",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign in / Sign up with Email
          </button>
        </form>

        {message && (
          <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: "#fff8d6", color: "#4a3f00" }}>
            {message}
          </div>
        )}

        <small style={{ color: "#9098a8", marginTop: 6 }}>
          By continuing you agree to PrepMate terms and privacy.
        </small>
      </div>
    </div>
  );
}
