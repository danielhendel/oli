// lib/auth/useAuthGate.ts
import { useEffect, useState } from "react";
import { getFirebaseAuth } from "../firebaseConfig";

export const useAuthGate = (): { ready: boolean; uid: string | null } => {
  const auth = getFirebaseAuth();
  const [ready, setReady] = useState<boolean>(false);
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUid(u?.uid ?? null);
      setReady(true);
    });
    return () => unsub();
  }, [auth]);

  return { ready, uid };
};
