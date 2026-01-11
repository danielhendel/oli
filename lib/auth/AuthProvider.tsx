// lib/auth/AuthProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
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

  // Important: resolve auth once for the provider lifetime (prevents instance drift)
  const auth = useMemo(() => getFirebaseAuth(), []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
    return () => unsub();
  }, [auth]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      initializing,
      getIdToken: async (forceRefresh?: boolean) => {
        // Use the already-known user first (this fixes the current bug).
        // Fallback to auth.currentUser only as a backup.
        const u = user ?? auth.currentUser;
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
  }, [user, initializing, auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
