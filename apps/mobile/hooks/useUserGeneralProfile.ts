// apps/mobile/hooks/useUserGeneralProfile.ts
/**
 * Purpose: Read/update /users/{uid}/profile/general via typed DAL.
 * Errors: Provides string error and saving flag for UI.
 */
import { useCallback, useEffect, useState } from 'react';
import { getGeneralProfile, upsertGeneralProfile } from '@/lib/db/users';
import { getFirebaseAuth } from '@/lib/firebaseClient';

export function useUserGeneralProfile() {
  const uid = getFirebaseAuth().currentUser?.uid ?? null;
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getGeneralProfile>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!uid) { setLoading(false); return; }
        const p = await getGeneralProfile(uid);
        if (alive) setProfile(p);
      } catch {
        if (alive) setError('Failed to load profile');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [uid]);

  const save = useCallback(async (patch: Partial<typeof profile extends infer T ? T : never>) => {
    if (!uid) return;
    try {
      setSaving(true);
      await upsertGeneralProfile(uid, patch as any);
      setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
    } finally {
      setSaving(false);
    }
  }, [uid]);

  return { uid, profile, loading, saving, error, save };
}
