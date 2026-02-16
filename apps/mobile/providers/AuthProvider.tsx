import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { ready, auth } from "@/lib/firebase/core";

type AuthContextValue = { user: User | null; initializing: boolean };
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const unsubRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await ready();
        if (!mounted) return;
        const a = auth();
        unsubRef.current = onAuthStateChanged(a, (u) => {
          setUser(u);
          setInitializing(false);
        });
      } catch (e) {
        // Never block the tree on error
        setInitializing(false);
        console.warn("[AuthProvider] init error:", e);
      }
    })();
    return () => {
      mounted = false;
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  // IMPORTANT: still render children while initializing so the app isn’t blank
  return <AuthContext.Provider value={{ user, initializing }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
