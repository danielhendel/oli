// apps/mobile/hooks/useUserProfile.ts
import { useCallback, useEffect, useState } from 'react';
import { getFirebaseAuth } from '@/lib/firebaseClient';
import { db } from '@/lib/db';
import { getProfileGeneral, upsertProfileGeneral } from '@/lib/db/profile';
import type { ProfileGeneral } from '@/types/profiles';

/**
 * Reads current user's ProfileGeneral and exposes an updater.
 * Aligns with your DAL signatures (db: Firestore, uid: string, data: ProfileGeneral|partial)
 */
export function useUserProfile() {
  const uid = getFirebaseAuth().currentUser?.uid ?? null;
  const [profile, setProfile] = useState<ProfileGeneral | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!uid) { setLoading(false); return; }
        const p = await getProfileGeneral(db(), uid);
        if (!alive) return;
        // Ensure minimal shape; keep fields consistent with /types/profiles.ts
        setProfile(
          p ?? ({
            uid,
            // BaseDoc timestamps may be added later by client saves; OK if missing
          } as ProfileGeneral)
        );
      } catch {
        if (alive) setError('Failed to load profile');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [uid]);

  const save = useCallback(
    async (partial: Partial<ProfileGeneral>) => {
      if (!uid) return;
      await upsertProfileGeneral(db(), uid, partial as ProfileGeneral);
      setProfile(prev => (prev ? { ...prev, ...partial } : prev));
    },
    [uid]
  );

  return { uid, profile, setProfile, save, loading, error };
}
