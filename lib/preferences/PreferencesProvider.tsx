// lib/preferences/PreferencesProvider.tsx
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
  } from "react";
  
  import { defaultPreferences, type Preferences, type MassUnit, type WeeklyFitnessGoals } from "@oli/contracts";
  import { useAuth } from "@/lib/auth/AuthProvider";
  import {
    getPreferences,
    updateMassUnit,
    updateSelectedGymId,
    updateMetricSourcePreference,
    updateWeeklyFitnessGoals,
  } from "@/lib/api/preferences";
  import { applySubmittedWeeklyFitnessGoalsToPreferences } from "@/lib/preferences/weeklyFitnessGoals";
  
  type PreferencesState =
    | { status: "partial"; preferences: Preferences }
    | { status: "ready"; preferences: Preferences }
    | { status: "error"; preferences: Preferences; message: string };
  
  type PreferencesContextValue = {
    state: PreferencesState;
    refresh: () => Promise<void>;
    setMassUnit: (mass: MassUnit) => Promise<void>;
    setSelectedGymId: (selectedGymId: string | null) => Promise<void>;
    setMetricSourcePreference: (metricId: string, sourceId: string | null) => Promise<void>;
    /**
     * Persist Dash Weekly Fitness goals via PUT /preferences. Returns true on success;
     * sets state to "error" with `message` on failure (existing values preserved).
     */
    setWeeklyFitnessGoals: (
      goals: Pick<
        WeeklyFitnessGoals,
        | "activityStepsPerDayGoal"
        | "strengthWorkoutsPerWeekGoal"
        | "cardioMilesPerWeekGoal"
        | "sleepHoursPerNightGoal"
      >,
    ) => Promise<boolean>;
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
  
    const setSelectedGymIdFn = async (selectedGymId: string | null): Promise<void> => {
      if (initializing || !user) {
        setState((s) => ({
          status: "ready",
          preferences: { ...s.preferences, selectedGymId },
        }));
        return;
      }
  
      const prev = state.preferences;
      setState({
        status: "ready",
        preferences: { ...prev, selectedGymId },
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
  
      const res = await updateSelectedGymId(token, selectedGymId);
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
  
    const setWeeklyFitnessGoalsFn = async (
      goals: Pick<
        WeeklyFitnessGoals,
        | "activityStepsPerDayGoal"
        | "strengthWorkoutsPerWeekGoal"
        | "cardioMilesPerWeekGoal"
        | "sleepHoursPerNightGoal"
      >,
    ): Promise<boolean> => {
      // Signed out / auth not ready: keep local-only (no API call).
      if (initializing || !user) {
        const stamp: WeeklyFitnessGoals = { ...goals, updatedAt: new Date().toISOString() };
        setState((s) => ({
          status: "ready",
          preferences: { ...s.preferences, weeklyFitnessGoals: stamp },
        }));
        return true;
      }

      let prevForRollback: Preferences | null = null;
      const optimistic: WeeklyFitnessGoals = { ...goals, updatedAt: new Date().toISOString() };
      setState((s) => {
        prevForRollback = s.preferences;
        return {
          status: "ready",
          preferences: { ...s.preferences, weeklyFitnessGoals: optimistic },
        };
      });

      const token = await getIdToken(false);
      if (!token) {
        setState((s) => ({
          status: "error",
          preferences: prevForRollback ?? s.preferences,
          message: "No auth token (try Debug → Re-auth)",
        }));
        return false;
      }

      const res = await updateWeeklyFitnessGoals(token, goals);
      if (!res.ok) {
        setState((s) => ({
          status: "error",
          preferences: prevForRollback ?? s.preferences,
          message: `${res.error} (kind=${res.kind}, status=${res.status}, requestId=${res.requestId ?? "n/a"})`,
        }));
        return false;
      }

      setState({
        status: "ready",
        preferences: applySubmittedWeeklyFitnessGoalsToPreferences(
          res.json,
          goals,
          optimistic.updatedAt,
        ),
      });
      return true;
    };

    const setMetricSourcePreferenceFn = async (metricId: string, sourceId: string | null): Promise<void> => {
      if (initializing || !user) {
        const m = { ...(state.preferences.metricSources ?? {}) };
        if (sourceId === null) delete m[metricId];
        else m[metricId] = sourceId;
        setState((s) => ({ ...s, status: "ready", preferences: { ...s.preferences, metricSources: m } }));
        return;
      }
  
      const prev = state.preferences;
      const nextMetricSources = { ...(prev.metricSources ?? {}) };
      if (sourceId === null) delete nextMetricSources[metricId];
      else nextMetricSources[metricId] = sourceId;
      setState({ status: "ready", preferences: { ...prev, metricSources: nextMetricSources } });
  
      const token = await getIdToken(false);
      if (!token) {
        setState({ status: "error", preferences: prev, message: "No auth token" });
        return;
      }
  
      const res = await updateMetricSourcePreference(token, metricId, sourceId);
      if (!res.ok) {
        setState({ status: "error", preferences: prev, message: res.error ?? "Failed to save" });
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
        setSelectedGymId: setSelectedGymIdFn,
        setMetricSourcePreference: setMetricSourcePreferenceFn,
        setWeeklyFitnessGoals: setWeeklyFitnessGoalsFn,
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
  