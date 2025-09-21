// pages/api/save-selected-plan.js
import supabase from "../../lib/supabase";

/**
 * Save a selected plan for a user.
 * Accepts JSON body:
 *   { user_id: "<uuid>", plan: "starter", priceValue: 299 }
 *
 * Or send Authorization: Bearer <access_token> to derive user from Supabase session.
 *
 * NOTE: This version intentionally DOES NOT include a 'price' column when inserting
 * into "subscriptions" to avoid schema cache errors if that column doesn't exist.
 */

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ensure we have a parsed JSON body
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON body" });
      }
    }

    const { user_id: bodyUserId, plan } = body ?? {};
    if (!plan) {
      return res.status(400).json({ error: "Missing plan in request body" });
    }

    // Derive user id from body or Authorization Bearer token
    let userId = bodyUserId ?? null;
    const authHeader = (req.headers?.authorization || req.headers?.Authorization || "").toString();

    if (!userId && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        if (supabase.auth && typeof supabase.auth.getUser === "function") {
          // supabase-js v2
          const { data, error } = await supabase.auth.getUser(token);
          if (!error && data?.user?.id) userId = data.user.id;
        } else if (supabase.auth && supabase.auth.api && typeof supabase.auth.api.getUser === "function") {
          // supabase-js v1
          const { data, error } = await supabase.auth.api.getUser(token);
          if (!error && data?.id) userId = data.id;
        }
      } catch (err) {
        console.warn("Could not resolve user from token:", err?.message ?? err);
      }
    }

    if (!userId) {
      return res.status(400).json({ error: "Missing user_id (supply user_id in body or Authorization Bearer token)" });
    }

    // Build payload using only safe/known columns to avoid schema mismatch:
    const insertPayload = {
      user_id: userId,
      plan,
      status: "active",
      activated_at: new Date().toISOString(),
    };

    // Insert into subscriptions (no "price" column included)
    const { data: insertData, error: insertError } = await supabase
      .from("subscriptions")
      .insert([insertPayload])
      .select()
      .limit(1);

    if (insertError) {
      console.error("Supabase insert error (subscriptions):", insertError);
      return res.status(500).json({ error: insertError.message || "Failed to save subscription (see server logs)" });
    }

    return res.status(200).json({ ok: true, saved: insertData?.[0] ?? null });
  } catch (err) {
    console.error("Unexpected save-selected-plan error:", err);
    return res.status(500).json({ error: err?.message || "Internal server error" });
  }
}
