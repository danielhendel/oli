// lib/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebaseConfig";

export type AuthContextValue = {
  user: User | null;

  // Back-compat with your existing app/_layout.tsx usage:
  initializing: boolean;

  // Optional nicer name for other screens:
  loading: boolean;

  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  useEffect(() => {
    const auth = getFirebaseAuth();

    const unsub = onAuthStateChanged(auth, (u: User | null) => {
      setUser(u);
      setInitializing(false);
    });

    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      initializing,
      loading: initializing,
      getIdToken: async (forceRefresh?: boolean): Promise<string | null> => {
        const u = getFirebaseAuth().currentUser;
        if (!u) return null;
        return u.getIdToken(Boolean(forceRefresh));
      },
      signOutUser: async (): Promise<void> => {
        await firebaseSignOut(getFirebaseAuth());
      },
    };
  }, [user, initializing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
