// lib/useRequirePlan.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "./supabase"; // make sure supabase client is exported here

/**
 * Hook to protect pages by subscription plan
 * @param {string|string[]} requiredPlan - plan name(s) required to access the page
 * @param {object} options
 * @param {string} options.redirectIfMissing - where to send user if not allowed
 */
export function useRequirePlan(requiredPlan, options = {}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [userPlan, setUserPlan] = useState(null);

  const redirectIfMissing = options.redirectIfMissing || "/plans";

  useEffect(() => {
    let mounted = true;

    async function checkPlan() {
      try {
        // get session
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if (!user) {
          if (mounted) {
            setLoading(false);
            router.replace("/auth");
          }
          return;
        }

        // fetch latest subscription for this user
        const { data, error } = await supabase
          .from("subscriptions")
          .select("plan,status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("DB error in useRequirePlan:", error.message);
          if (mounted) {
            setLoading(false);
            router.replace(redirectIfMissing);
          }
          return;
        }

        const activePlan = data && data.status === "active" ? data.plan : null;
        setUserPlan(activePlan);

        const required = Array.isArray(requiredPlan) ? requiredPlan : [requiredPlan];

        if (activePlan && required.includes(activePlan)) {
          if (mounted) {
            setAllowed(true);
            setLoading(false);
          }
        } else {
          if (mounted) {
            setAllowed(false);
            setLoading(false);
            router.replace(redirectIfMissing);
          }
        }
      } catch (err) {
        console.error("Unexpected error in useRequirePlan:", err);
        if (mounted) {
          setLoading(false);
          setAllowed(false);
          router.replace(redirectIfMissing);
        }
      }
    }

    checkPlan();

    return () => {
      mounted = false;
    };
  }, [requiredPlan, redirectIfMissing, router]);

  return { loading, allowed, userPlan };
}
