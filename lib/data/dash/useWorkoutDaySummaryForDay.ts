// lib/data/dash/useWorkoutDaySummaryForDay.ts
// Single-day read of workoutDaySummaries via GET .../workout-day-summaries?start=&end= (same range).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getWorkoutDaySummaries, type TruthGetOptions } from "@/lib/api/usersMe";
import type { WorkoutDaySummaryItemDto } from "@oli/contracts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import { pickWorkoutDaySummaryItemForDay } from "@/lib/data/dash/workoutDaySummaryRecapPick";

type State =
  | { status: "partial" }
  | { status: "missing" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: WorkoutDaySummaryItemDto };

type RefetchOpts = TruthGetOptions;

function withUniqueCacheBust(opts: RefetchOpts | undefined, seq: number): RefetchOpts | undefined {
  const cb = opts?.cacheBust;
  if (!cb) return opts;
  return { ...opts, cacheBust: `${cb}:${seq}` };
}

export function useWorkoutDaySummaryForDay(
  day: string,
): State & { refetch: (opts?: RefetchOpts) => void } {
  const { user, initializing, getIdToken } = useAuth();

  const dayRef = useRef(day);
  dayRef.current = day;

  const requestSeq = useRef(0);

  const [state, setState] = useState<State>({ status: "partial" });
  const stateRef = useRef<State>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const fetchOnce = useCallback(
    async (opts?: RefetchOpts) => {
      const seq = ++requestSeq.current;

      const safeSet = (next: State) => {
        if (seq === requestSeq.current) setState(next);
      };

      if (initializing || !user) {
        if (stateRef.current.status !== "ready") safeSet({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (!token || seq !== requestSeq.current) return;

      if (stateRef.current.status !== "ready") safeSet({ status: "partial" });

      const d = dayRef.current;
      const res = await getWorkoutDaySummaries(token, {
        start: d,
        end: d,
        ...withUniqueCacheBust(opts, seq),
      });
      if (seq !== requestSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);

      if (outcome.status === "error") {
        if (stateRef.current.status === "ready") return;
        safeSet({
          status: "error",
          error: outcome.error,
          requestId: outcome.requestId,
        });
        return;
      }

      if (outcome.status === "missing") {
        if (stateRef.current.status === "ready") return;
        safeSet({ status: "missing" });
        return;
      }

      const item = pickWorkoutDaySummaryItemForDay(outcome.data, d);
      if (item != null) {
        safeSet({ status: "ready", data: item });
        return;
      }

      if (stateRef.current.status === "ready") return;
      safeSet({ status: "missing" });
    },
    [getIdToken, initializing, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, day, user?.uid]);

  return useMemo(
    () => ({
      ...state,
      refetch: fetchOnce,
    }),
    [state, fetchOnce],
  );
}
