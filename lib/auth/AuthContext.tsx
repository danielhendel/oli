// lib/auth/AuthContext.tsx
/**
 * Purpose: Centralized auth state (loading/signedOut/signedIn) and actions.
 * Inputs: none (subscribes to Firebase auth state)
 * Side-effects: Navigation happens in route layouts; here we may provision user doc.
 * Errors: Exposes a simple error string; provisioning failures are non-fatal.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { appSignOut, signInWithApple as doApple, completeGoogleSignIn } from "./signIn";
import { ensureUserProvisioned } from "@/lib/users/provision";

type SignedIn = { status: "signedIn"; user: FirebaseAuthTypes.User };
type SignedOut = { status: "signedOut" };
type Loading = { status: "loading" };
type AuthState = Loading | SignedOut | SignedIn;

export type AuthCtx = {
  state: AuthState;
  user: FirebaseAuthTypes.User | null;

  // preferred actions
  signInApple: () => Promise<void>;
  completeGoogleSignIn: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;

  // legacy aliases (keep older screens working)
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<never>;

  error: string | null;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children?: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // Firebase app is initialized by app/_layout.tsx side-effect import.
    const unsub = auth().onAuthStateChanged(async (user: FirebaseAuthTypes.User | null) => {
      if (user) {
        setState({ status: "signedIn", user });

        // Non-blocking provisioning: do not hold UI; failures should not trap the user.
        try {
          await ensureUserProvisioned(user.uid, {
            email: user.email ?? null,
            displayName: user.displayName ?? null,
          });
        } catch {
          // Intentionally swallow to avoid leaking PII or blocking navigation.
          // Consider sending to telemetry (Sentry) in init if configured.
        }
      } else {
        setState({ status: "signedOut" });
      }
    });
    return unsub;
  }, []);

  const value = useMemo<AuthCtx>(() => {
    const user = state.status === "signedIn" ? state.user : null;

    const signInApple = async () => {
      await doApple();
    };
    const signInWithApple = signInApple; // legacy alias

    const signInWithGoogle = async (): Promise<never> => {
      throw new Error("Use <GoogleSignInButton onIdToken={completeGoogleSignIn} />");
    };

    const complete = async (idToken: string) => {
      await completeGoogleSignIn(idToken);
    };

    const signOut = async () => {
      await appSignOut();
    };

    return {
      state,
      user,
      error,
      signInApple,
      signInWithApple,
      signInWithGoogle,
      completeGoogleSignIn: complete,
      signOut,
    };
  }, [state, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
