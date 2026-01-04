// lib/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebaseConfig";
import { signOutUser as signOutUserAction } from "@/lib/auth/actions";

export type AuthContextValue = {
  user: User | null;
  initializing: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  signOutUser: () => Promise<void>;
  signOut: () => Promise<void>; // alias used by some screens
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren): React.ReactElement => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
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
        const auth = getFirebaseAuth();
        const u = auth.currentUser;
        if (!u) return null;
        return u.getIdToken(!!forceRefresh);
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
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
