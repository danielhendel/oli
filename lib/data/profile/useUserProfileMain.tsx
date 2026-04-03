// lib/data/profile/useUserProfileMain.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { defaultUserProfileMain, type UserProfileMain, type UserProfileMainPatch } from "@oli/contracts";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getUserProfileMain, putUserProfileMain } from "@/lib/api/profileMain";

/** Canonical readiness: missing | partial | ready | error (see lib/contracts/readiness.ts). */
export type UserProfileMainState =
  | { status: "missing" }
  | { status: "partial"; profile: UserProfileMain | null }
  /** `profile: null` means no `profile/main` doc yet — use `defaultUserProfileMain()` for display only. */
  | { status: "ready"; profile: UserProfileMain | null }
  | { status: "error"; profile: UserProfileMain | null; message: string };

type UserProfileMainContextValue = {
  state: UserProfileMainState;
  refresh: () => Promise<void>;
  patch: (p: UserProfileMainPatch) => Promise<boolean>;
};

const UserProfileMainContext = createContext<UserProfileMainContextValue | null>(null);

export function UserProfileMainProvider({ children }: { children: React.ReactNode }) {
  const { user, initializing, getIdToken } = useAuth();
  const [state, setState] = useState<UserProfileMainState>({ status: "missing" });
  /** Last server-confirmed profile, or null when no Firestore doc exists yet (never a client default object). */
  const readyRef = useRef<UserProfileMain | null>(null);

  const refresh = useCallback(async () => {
    if (initializing) {
      setState((s) =>
        s.status === "ready" ? { status: "partial", profile: s.profile } : { status: "partial", profile: null },
      );
      return;
    }

    if (!user) {
      readyRef.current = null;
      setState({ status: "missing" });
      return;
    }

    setState((s) => ({
      status: "partial",
      profile: s.status === "ready" ? s.profile : null,
    }));

    const token = await getIdToken(false);
    if (!token) {
      setState({ status: "error", profile: null, message: "No auth token" });
      return;
    }

    const res = await getUserProfileMain(token);
    if (!res.ok) {
      setState({
        status: "error",
        profile: null,
        message: `${res.error} (kind=${res.kind}, status=${res.status})`,
      });
      return;
    }

    readyRef.current = res.json;
    setState({ status: "ready", profile: res.json });
  }, [user, initializing, getIdToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patch = useCallback(
    async (p: UserProfileMainPatch): Promise<boolean> => {
      if (!user) return false;
      const base = readyRef.current ?? defaultUserProfileMain();

      setState({ status: "partial", profile: base });

      const token = await getIdToken(false);
      if (!token) {
        setState({ status: "error", profile: base, message: "No auth token" });
        return false;
      }

      const res = await putUserProfileMain(token, p);
      if (!res.ok) {
        setState({
          status: "error",
          profile: base,
          message: `${res.error} (kind=${res.kind}, status=${res.status})`,
        });
        return false;
      }

      readyRef.current = res.json;
      setState({ status: "ready", profile: res.json });
      return true;
    },
    [user, getIdToken],
  );

  const value = useMemo<UserProfileMainContextValue>(
    () => ({ state, refresh, patch }),
    [state, refresh, patch],
  );

  return <UserProfileMainContext.Provider value={value}>{children}</UserProfileMainContext.Provider>;
}

export function useUserProfileMain(): UserProfileMainContextValue {
  const ctx = useContext(UserProfileMainContext);
  if (!ctx) {
    throw new Error("useUserProfileMain must be used within UserProfileMainProvider");
  }
  return ctx;
}
