"use client";

import { useEffect, useRef } from "react";

/**
 * Automatically seeds demo data on first mount if the portal is empty.
 * Silent — no UI. Fires at most once per browser tab session per user.
 *
 * Only flags sessionStorage as "done" when the seed succeeds AND the caller
 * provides an onDone that should cause data to re-appear. If seed fails we
 * let the next mount retry (no lock-in).
 *
 * @param shouldSeed true when the current view has no data
 * @param loading    true while the data is still loading
 * @param onDone     called after a successful seed so the caller can refetch
 * @param userId     optional — ensures the "already seeded" flag is per-user
 *                   so sign-out/sign-in into a different account retries
 */
export function useAutoSeed(
  shouldSeed: boolean,
  loading: boolean,
  onDone?: () => void,
  userId?: string | null,
) {
  const firing = useRef(false);

  useEffect(() => {
    if (firing.current) return;
    if (loading) return;
    if (!shouldSeed) return;

    const key = `aayucare_seeded_${userId || "anon"}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(key) === "1") return;

    firing.current = true;
    (async () => {
      try {
        const res = await fetch("/api/seed", {
          method: "POST",
          credentials: "include",
          headers: { "x-seed-token": "aayucare-dev-seed" },
        });

        if (res.ok) {
          if (typeof window !== "undefined") sessionStorage.setItem(key, "1");
          onDone?.();
        } else {
          // Log the error so it's debuggable from DevTools, but allow retry on next mount
          const body = await res.text().catch(() => "");
          console.warn("[auto-seed] failed", res.status, body);
          firing.current = false;
        }
      } catch (err) {
        console.warn("[auto-seed] network error", err);
        firing.current = false;
      }
    })();
  }, [shouldSeed, loading, onDone, userId]);
}
