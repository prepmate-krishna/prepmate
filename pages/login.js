// pages/login.js
import { useState, useRef, useEffect } from "react";
import { auth } from "../lib/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI error states
  const [emailError, setEmailError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  // ref for email input so we can focus it
  const emailRef = useRef(null);

  // whenever emailError becomes non-empty, autofocus the email input
  useEffect(() => {
    if (emailError && emailRef.current) {
      try { emailRef.current.focus(); } catch (e) { /* ignore */ }
    }
  }, [emailError]);

  // Safety: suppress unhandled promise overlay in dev (keeps UX clean during prototyping)
  useEffect(() => {
    const onUnhandled = (ev) => {
      // Prevent Next's red overlay in dev by stopping the default devtools behavior.
      // We still log the error so you can inspect it in console.
      console.warn("Suppressed unhandledrejection (dev):", ev.reason);
      ev.preventDefault && ev.preventDefault();
    };
    window.addEventListener && window.addEventListener("unhandledrejection", onUnhandled);
    return () => window.removeEventListener && window.removeEventListener("unhandledrejection", onUnhandled);
  }, []);

  // helper to clear messages when user types
  const clearMessages = () => {
    if (emailError) setEmailError("");
    if (authMessage) setAuthMessage("");
  };

  // GOOGLE LOGIN
  const handleGoogleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    clearMessages();
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setAuthMessage("✅ Google login successful!");
    } catch (error) {
      console.error("Google login error:", error);
      setAuthMessage("Google login failed: " + (error?.message || "Try again"));
    }
  };

  // EMAIL SIGNUP - now an async function with try/catch
  const handleEmailSignup = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    clearMessages();

    if (!email) { setEmailError("Please enter an email"); return; }
    if (!password || password.length < 6) { setAuthMessage("Password must be at least 6 characters"); return; }

    try {
      // await and catch any thrown error here
      await createUserWithEmailAndPassword(auth, email, password);
      setAuthMessage("✅ Email signup successful!");
    } catch (error) {
      console.error("Email signup error (caught):", error);
      // Handle the specific firebase error codes
      if (error && error.code === "auth/email-already-in-use") {
        setEmailError("Email already exists");
      } else if (error && error.code === "auth/invalid-email") {
        setEmailError("Invalid email address");
      } else {
        // generic fallback
        setEmailError(error?.message || "Signup failed");
      }
      // ensure we DO NOT rethrow — handled here
    }
  };

  // EMAIL LOGIN
  const handleEmailLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    clearMessages();

    if (!email) { setEmailError("Please enter an email"); return; }
    if (!password) { setAuthMessage("Please enter your password"); return; }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setAuthMessage("✅ Email login successful!");
    } catch (error) {
      console.error("Email login error:", error);
      if (error && error.code === "auth/wrong-password") {
        setAuthMessage("Incorrect password");
      } else if (error && error.code === "auth/user-not-found") {
        setAuthMessage("No account found with this email");
      } else {
        setAuthMessage(error?.message || "Login failed");
      }
    }
  };

  // OPTIONAL: sign out (for testing)
  const handleSignOut = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      await signOut(auth);
      setAuthMessage("Signed out");
    } catch (e2) {
      console.error("Sign out failed", e2);
      setAuthMessage("Sign out failed");
    }
  };

  // Clear email error when user edits email
  const onEmailChange = (v) => {
    setEmail(v);
    if (emailError) setEmailError("");
    if (authMessage) setAuthMessage("");
  };

  return (
    <div style={{
      fontFamily: "system-ui",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      flexDirection: "column",
      gap: "12px",
      padding: 20
    }}>
      <h1>PrepMate — Login / Signup</h1>

      {/* GOOGLE */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        style={{
          padding: "10px 20px",
          cursor: "pointer",
          backgroundColor: "#4285F4",
          color: "white",
          border: "none",
          borderRadius: 6
        }}
      >
        Continue with Google
      </button>

      <div style={{ height: 12 }} />

      {/* EMAIL */}
      <input
        ref={emailRef}
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        style={{ padding: "8px", width: "280px" }}
        autoComplete="email"
      />
      {/* Inline email error */}
      {emailError ? (
        <div style={{ color: "crimson", fontSize: 13, marginTop: 6, width: 280 }}>{emailError}</div>
      ) : null}

      <input
        type="password"
        placeholder="Password (min 6 chars)"
        value={password}
        onChange={(e) => { setPassword(e.target.value); if (authMessage) setAuthMessage(""); }}
        style={{ padding: "8px", width: "280px", marginTop: 8 }}
        autoComplete="current-password"
      />

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" onClick={handleEmailSignup} style={{ padding: "8px 14px", cursor: "pointer" }}>
          Sign up
        </button>
        <button type="button" onClick={handleEmailLogin} style={{ padding: "8px 14px", cursor: "pointer" }}>
          Login
        </button>
        <button type="button" onClick={handleSignOut} style={{ padding: "8px 14px", cursor: "pointer" }}>
          Sign out
        </button>
      </div>

      {/* General auth messages */}
      {authMessage ? (
        <div style={{ color: "#333", fontSize: 13, marginTop: 10 }}>{authMessage}</div>
      ) : null}
    </div>
  );
}
