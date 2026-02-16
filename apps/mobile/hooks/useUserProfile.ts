// apps/mobile/hooks/useUserProfile.ts
import { useCallback, useEffect, useState } from "react";
import { ready, db as getDb } from "@/lib/firebase/core";
import { useAuth } from "@/providers/AuthProvider";
import { getProfileGeneral, upsertProfileGeneral } from "@/lib/db/profile";
import type { ProfileGeneral } from "@/types/profiles";

/**
 * Reads the signed-in user's ProfileGeneral and exposes an updater.
 * - Waits for Auth (via AuthProvider) before hitting Firestore
 * - Uses Firebase core singletons (db())
 */
export function useUserProfile() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [profile, setProfile] = useState<ProfileGeneral | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // If not signed in, stop early
        if (!uid) {
          if (alive) {
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        // Ensure Firebase is initialized (no-op if already ready)
        await ready();

        const p = await getProfileGeneral(getDb(), uid);
        if (!alive) return;

        // If no profile exists yet, surface null — UI can show an empty state
        setProfile(p ?? null);
      } catch {
        if (alive) setError("Failed to load profile");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [uid]);

  const save = useCallback(
    async (partial: Partial<ProfileGeneral>) => {
      if (!uid) return;
      await upsertProfileGeneral(getDb(), uid, partial as ProfileGeneral);
      setProfile((prev) => (prev ? { ...prev, ...partial } : (partial as ProfileGeneral)));
    },
    [uid]
  );

  return { uid, profile, setProfile, save, loading, error };
}
