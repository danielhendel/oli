import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getGeneralProfile, upsertGeneralProfile, UserGeneralProfile } from '@/lib/db/users';

type Status = 'idle' | 'loading' | 'saving' | 'error' | 'ready';

export interface UseUserProfile {
  status: Status;
  profile: UserGeneralProfile | null;
  error: Error | null;
  refresh: () => Promise<void>;
  update: (patch: Partial<UserGeneralProfile>) => Promise<void>;
  dirty: boolean;
}

/**
 * useUserProfile
 * Single-source-of-truth hook for /users/{uid}/profile/general
 * - No Firestore calls from screens
 * - Optimistic updates with rollback on error
 * - Exact optional property types respected
 */
export function useUserProfile(uid: string | null | undefined): UseUserProfile {
  const [status, setStatus] = useState<Status>('idle');
  const [profile, setProfile] = useState<UserGeneralProfile | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [dirty, setDirty] = useState(false);
  const lastLoadedUid = useRef<string | null>(null);

  const canLoad = useMemo(() => !!uid && uid.length > 0, [uid]);

  const load = useCallback(async () => {
    if (!canLoad) return;
    if (lastLoadedUid.current === uid && status === 'ready') return;

    setStatus('loading');
    setError(null);
    try {
      const data = await getGeneralProfile(uid!);
      setProfile(data);
      setStatus('ready');
      setDirty(false);
      lastLoadedUid.current = uid!;
    } catch (e: any) {
      setError(e);
      setStatus('error');
    }
  }, [canLoad, uid, status]);

  useEffect(() => {
    // initial + uid change
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    lastLoadedUid.current = null;
    await load();
  }, [load]);

  const update = useCallback(
    async (patch: Partial<UserGeneralProfile>) => {
      if (!uid) return;
      if (!profile) return;

      const before = profile;
      const optimistic: UserGeneralProfile = {
        ...before,
        ...patch,
        // Keep required fields safe with exact optional property types:
        firstName: patch.firstName ?? before.firstName,
        lastName: patch.lastName ?? before.lastName,
        displayName: patch.displayName ?? before.displayName,
        avatarUrl: patch.avatarUrl ?? before.avatarUrl,
        email: patch.email ?? before.email,
        createdAt: before.createdAt,
        updatedAt: Date.now(), // local hint; server will overwrite
      };

      // Optimistic UI
      setProfile(optimistic);
      setDirty(true);
      setStatus('saving');
      setError(null);

      try {
        await upsertGeneralProfile(uid, patch);
        // Re-sync after server write to ensure we reflect serverTimestamp
        const fresh = await getGeneralProfile(uid);
        setProfile(fresh);
        setDirty(false);
        setStatus('ready');
      } catch (e: any) {
        // Rollback
        setProfile(before);
        setDirty(true);
        setStatus('error');
        setError(e);
      }
    },
    [uid, profile]
  );

  return { status, profile, error, refresh, update, dirty };
}
