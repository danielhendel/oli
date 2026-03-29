import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { fetchNutritionLoggedDaysInRange } from "@/lib/data/nutrition/nutritionCalendarRange";
import type { DayKey } from "@/lib/ui/calendar/types";

type State =
  | { status: "partial" }
  | { status: "ready"; loggedDays: ReadonlySet<DayKey>; refreshing?: boolean }
  | { status: "error"; error: string; requestId: string | null };

export function useNutritionLoggedDaysForRange(
  startDay: DayKey,
  endDay: DayKey,
  options?: { enabled?: boolean; refreshEpoch?: number },
): State & { refetch: () => void } {
  const enabled = options?.enabled ?? true;
  const refreshEpoch = options?.refreshEpoch ?? 0;
  const { user, initializing, getIdToken } = useAuth();

  const [state, setState] = useState<State>({ status: "partial" });
  const seqRef = useRef(0);

  const boundsRef = useRef({ startDay, endDay });
  boundsRef.current = { startDay, endDay };

  const fetchRange = useCallback(async () => {
    const seq = ++seqRef.current;

    if (!enabled || initializing || !user) {
      if (seq === seqRef.current) setState({ status: "partial" });
      return;
    }

    const token = await getIdToken(false);
    if (seq !== seqRef.current) return;
    if (!token) {
      setState({ status: "error", error: "No auth token", requestId: null });
      return;
    }

    setState((prev) =>
      prev.status === "ready" ? { ...prev, refreshing: true } : { status: "partial" },
    );

    const { startDay: s, endDay: e } = boundsRef.current;
    const result = await fetchNutritionLoggedDaysInRange(token, s, e);
    if (seq !== seqRef.current) return;

    if (!result.ok) {
      setState({ status: "error", error: result.error, requestId: result.requestId });
      return;
    }

    setState({ status: "ready", loggedDays: result.days, refreshing: false });
  }, [enabled, getIdToken, initializing, user, refreshEpoch]);

  useEffect(() => {
    void fetchRange();
  }, [fetchRange, startDay, endDay, user?.uid]);

  return {
    ...state,
    refetch: fetchRange,
  };
}
