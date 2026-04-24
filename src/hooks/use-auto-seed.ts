"use client";

import { useEffect, useRef } from "react";

/**
 * Automatically seeds demo data on first mount if the portal is empty.
 * Silent — no UI. Fires at most once per browser tab session.
 *
 * @param shouldSeed true when the current view has no data (e.g. visits.length === 0)
 * @param loading    true while the data is still loading (don't seed during load)
 * @param onDone     optional callback after seed completes (e.g. refetch)
 */
export function useAutoSeed(shouldSeed: boolean, loading: boolean, onDone?: () => void) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (loading) return;
    if (!shouldSeed) return;

    // Also skip if we've seeded in this session already
    if (typeof window !== "undefined" && sessionStorage.getItem("healiox_auto_seeded") === "1") return;

    fired.current = true;
    (async () => {
      try {
        const res = await fetch("/api/seed", {
          method: "POST",
          credentials: "include",
          headers: { "x-seed-token": "healiox-dev-seed" },
        });
        if (res.ok) {
          if (typeof window !== "undefined") sessionStorage.setItem("healiox_auto_seeded", "1");
          onDone?.();
        } else {
          // Production or misconfig — fail silently, don't retry
          if (typeof window !== "undefined") sessionStorage.setItem("healiox_auto_seeded", "1");
        }
      } catch {
        // Network blip — allow retry on next mount
        fired.current = false;
      }
    })();
  }, [shouldSeed, loading, onDone]);
}
