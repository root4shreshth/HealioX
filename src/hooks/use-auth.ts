"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Profile = {
  role: string;
  full_name: string;
  org_id?: string;
};

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Guard against redundant profile fetches for the same user ID
  const fetchedForId = useRef<string | null>(null);

  const fetchProfile = useCallback(async (u: User) => {
    // Skip if we already fetched for this user in this session
    if (fetchedForId.current === u.id && profile) return;
    fetchedForId.current = u.id;

    // Fast path: role already in JWT metadata — no DB round-trip needed
    const metaRole =
      (u.app_metadata?.role as string) ||
      (u.user_metadata?.role as string);

    if (metaRole) {
      setProfile({
        role: metaRole,
        full_name: (u.user_metadata?.full_name as string) || u.email || "User",
      });
      // Fetch DB profile in background for org_id etc., but don't block render
      createClient()
        .from("profiles")
        .select("role, full_name, org_id")
        .eq("id", u.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data as Profile);
        });
      return;
    }

    // Slow path: no metadata, must hit DB
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("role, full_name, org_id")
      .eq("id", u.id)
      .single();

    if (data) {
      setProfile(data as Profile);
    } else {
      setProfile({ role: "family", full_name: u.email || "User" });
    }
  }, [profile]);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      // getSession() reads the JWT from cookies — no network call.
      // This is why the layout shows content fast instead of waiting for
      // a Supabase Auth server round-trip.
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      setUser(u);
      if (u) await fetchProfile(u);
      setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null;
        setUser(u);

        if (u && ["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
          // Reset the cache so we re-fetch on sign-in
          fetchedForId.current = null;
          await fetchProfile(u);
        } else if (!u) {
          setProfile(null);
          fetchedForId.current = null;
        }

        // Only call setLoading(false) during init, not on every auth change
        if (loading) setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, profile, loading };
}
