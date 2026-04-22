"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Profile = {
  role: string;
  full_name: string;
  org_id?: string;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (u: User) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("role, full_name, org_id")
      .eq("id", u.id)
      .single();

    if (data) {
      setProfile(data as Profile);
    } else {
      // Fallback to metadata — profile row may not exist yet
      setProfile({
        role: (u.app_metadata?.role as string) || (u.user_metadata?.role as string) || "family",
        full_name: (u.user_metadata?.full_name as string) || u.email || "User",
      });
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      if (u) await fetchProfile(u);
      setLoading(false);
    }

    init();

    // Re-fetch profile whenever auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED")) {
        await fetchProfile(u);
      } else if (!u) {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  return { user, profile, loading };
}
