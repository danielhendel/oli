import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AuthUser = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  initializing: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Stub auth state. Will be replaced by Firebase Auth in a later step.
  const [user, setUser] = useState<AuthUser | null>(null);
  const initializing = false;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      async signIn() {
        // Demo user for Sprint 0
        setUser({ uid: "demo-uid", email: "demo@oli.test", displayName: "Demo" });
      },
      async signOut() {
        setUser(null);
      },
    }),
    [user, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
