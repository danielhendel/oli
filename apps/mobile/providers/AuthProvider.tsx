// apps/mobile/providers/AuthProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { warmAuth, getFirebaseAuth } from '@/lib/firebaseClient';
import { ensureUserBootstrap } from '@/lib/auth/postSignIn';

// ---------- Types ----------
type AuthContextValue = {
  user: User | null;
  initializing: boolean;
};

// ---------- Context ----------
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------- Provider ----------
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Ensure native Auth is initialized before subscribing
        await warmAuth();
        if (!mounted) return;

        const auth = getFirebaseAuth();

        unsubRef.current = onAuthStateChanged(auth, async (u) => {
          setUser(u);
          setInitializing(false);

          // Bootstrap Firestore user profile after sign-in
          if (u) {
            try {
              await ensureUserBootstrap(u.uid, u.email ?? undefined);
            } catch (e) {
              console.warn('[AuthProvider] ensureUserBootstrap failed:', e);
            }
          }
        });
      } catch (err) {
        console.error('[AuthProvider] Initialization error:', err);
        setInitializing(false);
      }
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------- Hook ----------
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
