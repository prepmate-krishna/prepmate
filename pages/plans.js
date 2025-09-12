// pages/plans.js
import { useEffect, useState } from "react";
import { auth, firestore } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function Plans() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  const handleSelectPlan = async (plan) => {
    if (!user) {
      setStatus("You must login first.");
      return;
    }
    try {
      const docRef = doc(firestore, "users", user.uid);
      await setDoc(docRef, { plan }, { merge: true });
      setStatus(`✅ You selected the ${plan} plan`);
    } catch (e) {
      console.error("Plan save error", e);
      setStatus("Error saving plan: " + e.message);
    }
  };

  if (!user) {
    return <div style={{ padding: 20 }}>
      <h2>Please <a href="/login">login</a> first</h2>
    </div>;
  }

  return (
    <div style={{
      fontFamily: "system-ui",
      padding: 24,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 20
    }}>
      <h1>Select Your PrepMate Plan</h1>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
        {/* CORE PLAN */}
        <div style={{
          border: "1px solid #ccc",
          borderRadius: 10,
          padding: 20,
          width: 220,
          textAlign: "center"
        }}>
          <h3>Core</h3>
          <p>₹399 / month</p>
          <ul style={{ textAlign: "left", fontSize: 14 }}>
            <li>Upload PDF/Word/images</li>
            <li>AI test generation (2–20 Qs)</li>
            <li>AI report: correct/wrong/weak topics</li>
            <li>No cloud storage</li>
          </ul>
          <button onClick={() => handleSelectPlan("Core")}>Choose Core</button>
        </div>

        {/* PRIME PLAN */}
        <div style={{
          border: "2px solid #0070f3",
          borderRadius: 10,
          padding: 20,
          width: 220,
          textAlign: "center"
        }}>
          <h3>Prime</h3>
          <p>₹799 / month</p>
          <ul style={{ textAlign: "left", fontSize: 14 }}>
            <li>Everything in Core</li>
            <li>Cloud storage for all uploads</li>
            <li>Weekly + Monthly tests</li>
            <li>WhatsApp reminders</li>
            <li>AI explanations + references</li>
          </ul>
          <button onClick={() => handleSelectPlan("Prime")}>Choose Prime</button>
        </div>

        {/* ELITE PLAN */}
        <div style={{
          border: "2px solid gold",
          borderRadius: 10,
          padding: 20,
          width: 220,
          textAlign: "center"
        }}>
          <h3>Elite</h3>
          <p>₹999 / month</p>
          <ul style={{ textAlign: "left", fontSize: 14 }}>
            <li>Everything in Prime</li>
            <li>Parent number verification</li>
            <li>Parent notifications</li>
            <li>Smart revision (spaced repetition)</li>
            <li>Gamification (streaks, leaderboards, badges)</li>
            <li>AI study planner</li>
          </ul>
          <button onClick={() => handleSelectPlan("Elite")}>Choose Elite</button>
        </div>

        {/* ELITE+ PLAN */}
        <div style={{
          border: "2px solid purple",
          borderRadius: 10,
          padding: 20,
          width: 220,
          textAlign: "center"
        }}>
          <h3>Elite+</h3>
          <p>₹1199 / month</p>
          <ul style={{ textAlign: "left", fontSize: 14 }}>
            <li>Everything in Elite</li>
            <li>Priority support (fast query resolution)</li>
            <li>Exclusive premium study resources</li>
            <li>Early access to new AI features</li>
          </ul>
          <button onClick={() => handleSelectPlan("Elite+")}>Choose Elite+</button>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>{status}</div>
    </div>
  );
}
