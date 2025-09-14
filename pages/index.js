// pages/index.js
import Head from "next/head";

export default function Home() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "black",
      color: "#40E0D0" // Tiffany green
    }}>
      <Head>
        <title>PrepMate</title>
        <meta name="description" content="PrepMate — Your AI Test Preparation Partner" />
        <link rel="icon" href="/prepmate-logo.png" />
      </Head>

      {/* Logo */}
      <img
        src="/prepmate-logo.png"
        alt="PrepMate Logo"
        style={{ width: 180, height: "auto", marginBottom: 20 }}
      />

      {/* Title */}
      <h1 style={{ fontSize: "2rem", marginBottom: "10px" }}>
        Welcome to <span style={{ color: "#40E0D0" }}>PrepMate</span>
      </h1>

      {/* Tagline */}
      <p style={{ maxWidth: 600, textAlign: "center", fontSize: "1.1rem" }}>
        Upload your study material, generate smart tests, and get AI-powered analysis.
      </p>
    </div>
  );
}
