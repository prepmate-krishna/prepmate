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
        <link rel="icon" href="/prepmate-logo.png" />
      </Head>

      <img 
        src="/prepmate-logo.png" 
        alt="PrepMate Logo" 
        style={{ width: 180, height: "auto", marginBottom: 20 }}
      />
      <h1 style={{ fontSize: "2rem" }}>Welcome to PrepMate — Your Preparation Partner</h1>
      <p style={{ maxWidth: 600, textAlign: "center", marginTop: 10 }}>
        Start creating smart tests and track your progress.
      </p>
    </div>
  );
}
