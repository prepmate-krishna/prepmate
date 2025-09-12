// pages/setup-profile.js
import { useEffect, useState } from "react";
import { auth, firestore } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

export default function SetupProfile() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [exam, setExam] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingUser(false);
      // preload if profile exists
      if (u) preloadProfile(u.uid);
    });
    return () => unsub();
  }, []);

  const preloadProfile = async (uid) => {
    try {
      const docRef = doc(firestore, "users", uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setName(data.name || "");
        setUsername(data.username || "");
        setExam(data.exam || "");
      }
    } catch (e) {
      console.error("preload error", e);
    }
  };

  const checkUsernameUnique = async (u) => {
    const usersRef = collection(firestore, "users");
    const q = query(usersRef, where("username", "==", u));
    const snap = await getDocs(q);
    return snap.empty;
  };

  const handleSave = async () => {
    if (!user) {
      setStatus("You must be logged in to save profile.");
      return;
    }
    if (!name || !username || !exam) {
      setStatus("Please fill name, username, and exam.");
      return;
    }
    // basic username validation
    const clean = username.trim().toLowerCase();
    if (!/^[a-z0-9._]{3,30}$/.test(clean)) {
      setStatus("Username must be 3-30 chars: a-z, 0-9, . or _");
      return;
    }

    setStatus("Checking username...");
    try {
      // If username already belongs to this user (preload), allow saving
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("username", "==", clean));
      const snap = await getDocs(q);

      let canUse = true;
      if (!snap.empty) {
        // if any document exists, check if it's the current user
        if (snap.size === 1) {
          const docSnap = snap.docs[0];
          if (docSnap.id !== user.uid) {
            canUse = false;
          }
        } else {
          canUse = false;
        }
      }

      if (!canUse) {
        setStatus("Username already taken. Pick another.");
        return;
      }

      // Save profile
      const docRef = doc(firestore, "users", user.uid);
      await setDoc(docRef, {
        name: name.trim(),
        username: clean,
        exam,
        email: user.email || null,
        phone: user.phoneNumber || null,
        createdAt: new Date().toISOString()
      }, { merge: true });

      setStatus("Profile saved ✅");
    } catch (e) {
      console.error(e);
      setStatus("Error saving profile: " + e.message);
    }
  };

  if (loadingUser) return <div style={{padding:20}}>Loading user...</div>;
  if (!user) return <div style={{padding:20}}>You must <a href="/login">login</a> first.</div>;

  return (
    <div style={{
      fontFamily: 'system-ui',
      padding: 24,
      maxWidth: 720,
      margin: '40px auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      <h2>Setup your PrepMate profile</h2>
      <div>
        <strong>Signed in as:</strong> {user.email || (user.phoneNumber ?? "unknown")}
      </div>

      <label>Name</label>
      <input value={name} onChange={(e)=>setName(e.target.value)} style={{padding:8, width:'100%'}} />

      <label>Username (unique)</label>
      <input value={username} onChange={(e)=>setUsername(e.target.value)} style={{padding:8, width:'100%'}} />
      <small>Allowed: a-z, 0-9, dot, underscore. 3-30 chars.</small>

      <label>Exam you are preparing for</label>
      <select value={exam} onChange={(e)=>setExam(e.target.value)} style={{padding:8}}>
        <option value="">-- select exam --</option>
        <option value="JEE">JEE (Main/Advanced)</option>
        <option value="NEET">NEET</option>
        <option value="SSC">SSC</option>
        <option value="UPSC">UPSC</option>
        <option value="CUET">CUET</option>
        <option value="OTHER">Other</option>
      </select>

      <div style={{display:'flex', gap:8}}>
        <button onClick={handleSave} style={{padding:'10px 16px'}}>Save Profile</button>
        <a style={{alignSelf:'center'}} href="/">Back home</a>
      </div>

      <div style={{color:'#333', marginTop:6}}>
        {status}
      </div>
    </div>
  );
}
