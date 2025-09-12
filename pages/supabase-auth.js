// pages/supabase-auth.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function SupabaseAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const session = supabase.auth.getSession().then(r => {
      if (r?.data?.session?.user) setUser(r.data.session.user);
    }).catch(()=>{});
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription?.unsubscribe?.();
  }, []);

  // sign up using email + password (magic link disabled - password flow)
  const handleSignUp = async () => {
    setMessage("");
    if (!email || !password) { setMessage("Fill email & password"); return; }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });
      if (error) {
        setMessage("Signup error: " + error.message);
        return;
      }
      // data may contain user (depends on confirmation settings)
      setMessage("Signup initiated. Check your email if confirmation required. If instant, you should be logged in.");
      // If user is returned, create a row in public.users mapping ext_id to user.id
      if (data?.user) {
        await createUserRow(data.user);
      }
    } catch (e) {
      console.error(e);
      setMessage("Unexpected error: " + e.message);
    }
  };

  // login using email + password
  const handleLogin = async () => {
    setMessage("");
    if (!email || !password) { setMessage("Fill email & password"); return; }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setMessage("Login error: " + error.message); return; }
      setMessage("✅ Logged in");
      if (data?.user) {
        // ensure user row exists
        await createUserRow(data.user);
      }
    } catch (e) {
      console.error(e);
      setMessage("Unexpected error: " + e.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessage("Signed out");
  };

  // helper: create a users row in our public.users table if not exists
  const createUserRow = async (sbUser) => {
    try {
      // try to find by ext_id
      const { data: existing, error: qerr } = await supabase
        .from("users")
        .select("id, ext_id, email")
        .eq("ext_id", sbUser.id)
        .limit(1);

      if (qerr) {
        console.error("query err", qerr);
      }
      if (existing && existing.length > 0) {
        // already exists
        return;
      }

      // insert
      const insertPayload = {
        ext_id: sbUser.id,
        email: sbUser.email,
        name: sbUser.user_metadata?.full_name ?? null,
        phone: sbUser.user_metadata?.phone ?? null,
      };

      const { data: ins, error: ierr } = await supabase
        .from("users")
        .insert([insertPayload]);

      if (ierr) {
        console.error("insert err", ierr);
      } else {
        console.log("Inserted user row", ins);
      }
    } catch (e) {
      console.error("createUserRow err", e);
    }
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 20 }}>
      <h2>Supabase Auth — Signup / Login (test)</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
        <button onClick={handleSignUp} type="button">Sign up</button>
        <button onClick={handleLogin} type="button">Login</button>
        <button onClick={handleLogout} type="button">Logout</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <b>Status:</b> {message}
      </div>

      <div style={{ marginTop: 12 }}>
        <b>Current user:</b>
        <pre style={{ background: "#f4f4f4", padding: 8, maxWidth: 600 }}>{user ? JSON.stringify(user, null, 2) : "Not logged in"}</pre>
      </div>

      <div style={{ marginTop: 12 }}>
        <a href="/upload">Upload page</a> · <a href="/plans">Plans</a>
      </div>
    </div>
  );
}
