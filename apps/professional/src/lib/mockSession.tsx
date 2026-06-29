"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type MockSession = {
  trainerName: string;
  role: "trainer";
};

type SessionContextValue = {
  session: MockSession | null;
  signIn: (trainerName: string) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MockSession | null>(null);

  const value = useMemo(
    () => ({
      session,
      signIn: (trainerName: string) => {
        setSession({ trainerName, role: "trainer" });
      },
      signOut: () => {
        setSession(null);
      },
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
