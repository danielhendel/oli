/**
 * Resumes account-deletion local cleanup after force-quit (Stage 1C).
 */

import { useEffect, useRef } from "react";

import {
  readAccountDeletionRecoveryMarker,
  resumeAccountDeletionLocalCleanup,
} from "@/lib/auth/accountLifecycleCleanup";
import { useAuth } from "@/lib/auth/AuthProvider";

export function AccountDeletionRecoveryRunner(): null {
  const { user, initializing, signOutUser } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (initializing || ranRef.current) return;

    let cancelled = false;

    async function run() {
      const marker = await readAccountDeletionRecoveryMarker();
      if (!marker || cancelled) return;

      ranRef.current = true;
      const uid = user?.uid ?? null;
      await resumeAccountDeletionLocalCleanup(uid);
      if (user) {
        await signOutUser();
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [initializing, user, signOutUser]);

  return null;
}
