// lib/preferences/PreferencesProvider.tsx
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
  } from "react";
  
  import { defaultPreferences, type Preferences, type MassUnit } from "@oli/contracts";
  import { useAuth } from "@/lib/auth/AuthProvider";
  import { getPreferences, updateMassUnit } from "@/lib/api/preferences";
  
  type PreferencesState =
    | { status: "partial"; preferences: Preferences }
    | { status: "ready"; preferences: Preferences }
    | { status: "error"; preferences: Preferences; message: string };
  
  type PreferencesContextValue = {
    state: PreferencesState;
    refresh: () => Promise<void>;
    setMassUnit: (mass: MassUnit) => Promise<void>;
  };
  
  const PreferencesContext = createContext<PreferencesContextValue | null>(null);
  
  export const PreferencesProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { user, initializing, getIdToken } = useAuth();
  
    const [state, setState] = useState<PreferencesState>({
      status: "ready",
      preferences: defaultPreferences(),
    });
  
    const refresh = async (): Promise<void> => {
      if (initializing) {
        setState((s) => ({ ...s, status: "partial" }));
        return;
      }
  
      if (!user) {
        setState({ status: "ready", preferences: defaultPreferences() });
        return;
      }
  
      setState((s) => ({ ...s, status: "partial" }));
  
      const token = await getIdToken(false);
      if (!token) {
        setState((s) => ({
          status: "error",
          preferences: s.preferences,
          message: "No auth token (try Debug → Re-auth)",
        }));
        return;
      }
  
      const res = await getPreferences(token);
      if (!res.ok) {
        setState((s) => ({
          status: "error",
          preferences: s.preferences,
          message: `${res.error} (kind=${res.kind}, status=${res.status}, requestId=${res.requestId ?? "n/a"})`,
        }));
        return;
      }
  
      setState({ status: "ready", preferences: res.json });
    };
  
    const setMassUnit = async (mass: MassUnit): Promise<void> => {
      // If signed out or auth not ready, only update local defaults
      if (initializing || !user) {
        setState((s) => ({
          status: "ready",
          preferences: { ...s.preferences, units: { ...s.preferences.units, mass } },
        }));
        return;
      }
  
      const prev = state.preferences;
  
      // Optimistic update
      setState({
        status: "ready",
        preferences: { ...prev, units: { ...prev.units, mass } },
      });
  
      const token = await getIdToken(false);
      if (!token) {
        setState({
          status: "error",
          preferences: prev,
          message: "No auth token (try Debug → Re-auth)",
        });
        return;
      }
  
      const res = await updateMassUnit(token, mass);
      if (!res.ok) {
        setState({
          status: "error",
          preferences: prev,
          message: `${res.error} (kind=${res.kind}, status=${res.status}, requestId=${res.requestId ?? "n/a"})`,
        });
        return;
      }
  
      setState({ status: "ready", preferences: res.json });
    };
  
    // ✅ Auto-refresh on auth lifecycle changes
    useEffect(() => {
      void refresh();
    }, [user, initializing]);
  
    const value = useMemo<PreferencesContextValue>(
      () => ({
        state,
        refresh,
        setMassUnit,
      }),
      [state],
    );
  
    return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
  };
  
  export function usePreferences(): PreferencesContextValue {
    const ctx = useContext(PreferencesContext);
    if (!ctx) {
      throw new Error("usePreferences must be used within PreferencesProvider");
    }
    return ctx;
  }
  