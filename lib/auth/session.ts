// lib/auth/session.ts
import { useAuth } from "./AuthContext";

/** Throws if not signed in (optional helper for guarded routes). */
export function useAuthedUser() {
  const { user } = useAuth();
  if (!user) throw new Error("Must be signed in");
  return user;
}

/**
 * Back-compat for older code.
 * - Returns the full auth context (user, actions, state, etc.)
 * - Also adds a `loading` boolean expected by legacy callers.
 */
export function useAuthSession() {
  const ctx = useAuth();
  const loading = ctx.state.status === "loading";
  return { ...ctx, loading };
}

