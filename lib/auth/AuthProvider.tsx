// lib/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { getFirebaseAuth } from "../firebaseConfig";

type AuthState = {
  user: User | null;
  initializing: boolean;
  signOutUser: () => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
};

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const auth = useMemo(() => getFirebaseAuth(), []);

  const [user, setUser] = useState<User | null>(auth.currentUser ?? null);
  const [initializing, setInitializing] = useState<boolean>(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, [auth]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      initializing,
      signOutUser: async () => {
        await signOut(auth);
      },
      getIdToken: async (forceRefresh?: boolean) => {
        if (!auth.currentUser) return null;
        return auth.currentUser.getIdToken(Boolean(forceRefresh));
      },
    }),
    [auth, initializing, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
