// apps/mobile/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, type Unsubscribe } from "firebase/auth";
import { ready, auth as getAuth } from "@/lib/firebase/core";

type AuthContextValue = {
  user: User | null;
  initializing: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const unsubRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Ensure Firebase app/auth/db are initialized once (native uses RN persistence)
        await ready();
        if (!mounted) return;

        const a = getAuth();
        // Single subscription to auth state
        unsubRef.current = onAuthStateChanged(a, (u) => {
          if (!mounted) return;
          setUser(u);
          setInitializing(false);
        });
      } catch (e) {
        // Fail closed but unblock UI so app can render an error boundary/signed-out state
        console.warn("[AuthProvider] init failed:", e);
        if (mounted) setInitializing(false);
      }
    })();

    return () => {
      mounted = false;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, []);

  const value: AuthContextValue = { user, initializing };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
