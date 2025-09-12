// pages/upload.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [sbUser, setSbUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getUser()
      .then((res) => {
        if (!mounted) return;
        const u = res?.data?.user ?? null;
        setSbUser(u);
        console.log("supabase getUser ->", u ? u.id : "no user");
      })
      .catch((err) => {
        console.log("getUser error:", err);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setSbUser(u);
      console.log("auth state changed ->", u ? u.id : "signed out");
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0] ?? null);
    setStatus("");
  };

  const handleUpload = async () => {
    setStatus("");
    if (!file) {
      setStatus("Please select a file first");
      return;
    }
    if (!sbUser) {
      setStatus("You must be signed in to upload");
      return;
    }

    setStatus("Uploading...");
    console.log(`Starting upload for file: ${file.name} (${file.type}, ${file.size} bytes)`);

    try {
      const filePath = `user-${sbUser.id}/${Date.now()}-${file.name}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("user-uploads")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.log("Storage upload error:", uploadError);
        setStatus("❌ Upload failed (storage): " + uploadError.message);
        return;
      }
      console.log("Storage upload success:", uploadData);

      // Find matching public.users row by ext_id = sbUser.id
      const { data: userRows, error: qErr } = await supabase
        .from("users")
        .select("id, ext_id")
        .eq("ext_id", sbUser.id)
        .limit(1);

      console.log("Query users result:", { userRows, qErr, sbUserId: sbUser.id });

      let userId = null;
      if (qErr) {
        console.log("Error querying users table:", qErr);
        setStatus("❌ Upload succeeded but DB lookup failed: " + (qErr.message || JSON.stringify(qErr)));
        return;
      }

      if (userRows && userRows.length > 0) {
        userId = userRows[0].id;
        console.log("Found existing user mapping:", userId, userRows[0].ext_id);
      } else {
        // Create a mapping if not present
        const insertPayload = {
          ext_id: sbUser.id,
          email: sbUser.email ?? null,
          name: sbUser.user_metadata?.full_name ?? null,
          phone: sbUser.user_metadata?.phone ?? null
        };

        const { data: ins, error: insErr } = await supabase
          .from("users")
          .insert([insertPayload])
          .select("id")
          .limit(1);

        console.log("Insert user result:", { ins, insErr });
        if (insErr) {
          console.log("Insert user row error:", insErr);
          setStatus("❌ Upload succeeded but failed creating user mapping: " + (insErr.message || JSON.stringify(insErr)));
          return;
        }
        if (ins && ins.length > 0) userId = ins[0].id;
        console.log("Created user mapping, id:", userId);
      }

      if (!userId) {
        console.log("No userId found after lookup/insert. Aborting metadata save.");
        setStatus("❌ Upload succeeded but user mapping missing; metadata not saved.");
        return;
      }

      // Insert metadata into public.uploads
      const { data: metaData, error: metaErr } = await supabase
        .from("uploads")
        .insert([
          {
            user_id: userId,
            bucket: "user-uploads",
            path: uploadData?.path ?? filePath,
            filename: file.name,
            mime: file.type,
            size: file.size
          }
        ]);

      if (metaErr) {
        console.log("Insert upload metadata error:", metaErr);
        setStatus("✅ File uploaded to storage but saving metadata failed: " + (metaErr.message || JSON.stringify(metaErr)));
        return;
      }

      console.log("Upload metadata saved:", metaData);
      setStatus("✅ File uploaded and metadata saved!");
      setFile(null);
    } catch (e) {
      console.error("Unexpected upload error:", e);
      setStatus("❌ Upload failed: " + (e?.message || String(e)));
    }
  };

  return (
    <div style={{
      fontFamily: "system-ui",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      minHeight: "100vh",
      paddingTop: 60,
      gap: 12,
      padding: 24
    }}>
      <div style={{
        width: 640,
        maxWidth: "94%",
        border: "1px solid #e6e6e6",
        padding: 20,
        borderRadius: 8,
        boxShadow: "0 6px 18px rgba(0,0,0,0.05)"
      }}>
        <h1 style={{ margin: 0, marginBottom: 12 }}>Upload for Test</h1>

        <div style={{ marginBottom: 12 }}>
          <input type="file" onChange={handleFileChange} />
          <button onClick={handleUpload} style={{ marginLeft: 8, padding: "8px 12px" }}>Upload</button>
        </div>

        <div style={{ marginTop: 8 }}>
          <strong>Status:</strong> <span>{status}</span>
        </div>

        <div style={{ marginTop: 12, color: "#555" }}>
          {sbUser ? `Signed in as: ${sbUser.email ?? sbUser.id}` : "Not signed in"}
        </div>
      </div>
    </div>
  );
}
