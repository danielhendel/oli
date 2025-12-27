// lib/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebaseConfig";
import { signOutUser as signOutUserAction } from "@/lib/auth/actions";

export type AuthContextValue = {
  user: User | null;
  initializing: boolean;

  /**
   * Returns Firebase ID token for current user (or null if signed out)
   */
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;

  /**
   * Back-compat: debug/token.tsx expects this name
   */
  signOutUser: () => Promise<void>;

  /**
   * Preferred name for UI screens (settings/account.tsx)
   */
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setInitializing(false);
    });
    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      initializing,

      getIdToken: async (forceRefresh?: boolean) => {
        const u = getFirebaseAuth().currentUser;
        if (!u) return null;
        return u.getIdToken(Boolean(forceRefresh));
      },

      signOutUser: async () => {
        await signOutUserAction();
      },

      signOut: async () => {
        await signOutUserAction();
      },
    };
  }, [user, initializing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
