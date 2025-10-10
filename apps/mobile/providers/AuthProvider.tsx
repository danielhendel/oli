// apps/mobile/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { warmAuth, getFirebaseAuth } from '@/lib/firebaseClient';

type AuthContextValue = {
  user: User | null;
  initializing: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await warmAuth(); // ensure native Auth registration before subscribing
      if (!mounted) return;

      const auth = getFirebaseAuth();
      unsubRef.current = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setInitializing(false);
      });
    })();

    return () => {
      mounted = false;
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, []);

  const value: AuthContextValue = { user, initializing };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
