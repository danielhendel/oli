// lib/auth/useAuthGate.ts
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseConfig";

export type AuthGateState =
  | { status: "loading"; user: null }
  | { status: "signedOut"; user: null }
  | { status: "signedIn"; user: User };

export const useAuthGate = (): AuthGateState => {
  const [state, setState] = useState<AuthGateState>({ status: "loading", user: null });

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (user) => {
      if (!user) setState({ status: "signedOut", user: null });
      else setState({ status: "signedIn", user });
    });
    return () => unsub();
  }, []);

  return state;
};
