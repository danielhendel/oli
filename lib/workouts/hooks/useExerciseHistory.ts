/**
 * Hook to load per-exercise history from journal (no Firebase/API).
 * Used by exercise-history screen.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getExerciseHistory, type ExerciseHistoryResult } from "@/lib/workouts/memory/exerciseHistory";
import type { StrengthLoggingType } from "@/lib/workouts/exercises/loggingType";

/** Uses canonical readiness: partial | ready | error (see lib/contracts/readiness.ts). */
export type ExerciseHistoryState =
  | { status: "partial" }
  | { status: "ready"; data: ExerciseHistoryResult }
  | { status: "error"; error: string };

export type UseExerciseHistoryReturn = ExerciseHistoryState & {
  refetch: () => void;
};

/**
 * Load exercise history for the given exerciseId. Requires signed-in user.
 * Returns partial/ready/error; refetch reloads from journal.
 */
export function useExerciseHistory(
  exerciseId: string | null,
  loggingType: StrengthLoggingType,
): UseExerciseHistoryReturn {
  const { user, initializing } = useAuth();
  const [state, setState] = useState<ExerciseHistoryState>({ status: "partial" });
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!exerciseId || exerciseId.trim() === "" || !user) {
      setState({
        status: "ready",
        data: {
          summary: {
            lastPerformedAt: null,
            totalSessions: 0,
            bestE1RmKg: null,
            lastSummaryText: null,
            bestSetReps: null,
            bestSessionReps: null,
          },
          sessions: [],
        },
      });
      return;
    }

    setState({ status: "partial" });
    try {
      const data = await getExerciseHistory(user.uid, exerciseId, loggingType);
      if (!mountedRef.current) return;
      setState({ status: "ready", data });
    } catch (e) {
      if (!mountedRef.current) return;
      const message = e instanceof Error ? e.message : "Failed to load history";
      setState({ status: "error", error: message });
    }
  }, [exerciseId, loggingType, user?.uid]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (initializing) return;
    void load();
  }, [initializing, load]);

  const refetch = useCallback(() => {
    void load();
  }, [load]);

  return { ...state, refetch };
}
