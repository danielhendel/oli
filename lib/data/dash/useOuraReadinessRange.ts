/**
 * Bounded GET /users/me/oura-readiness-range for an elapsed week window.
 * Exact provider days only — no fallback densification.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { getOuraReadinessRange } from "@/lib/api/ouraReadinessRange";
import type { OuraReadinessRangeDayDto } from "@oli/contracts/ouraVendor";
import type { DayKey } from "@/lib/ui/calendar/types";

export type OuraReadinessRangeState =
  | { status: "partial" }
  | { status: "ready"; days: readonly OuraReadinessRangeDayDto[]; start: DayKey; end: DayKey }
  | { status: "error"; error: string; days: readonly OuraReadinessRangeDayDto[] };

export type UseOuraReadinessRangeResult = OuraReadinessRangeState & {
  refetch: (opts?: { cacheBust?: string }) => void;
};

export function useOuraReadinessRange(
  start: DayKey | null,
  end: DayKey | null,
  options?: { enabled?: boolean },
): UseOuraReadinessRangeResult {
  const { user, initializing, getIdToken } = useAuth();
  const enabled = options?.enabled !== false;
  const requestSeq = useRef(0);
  const authRef = useRef({ initializing, userUid: user?.uid, getIdToken });
  authRef.current = { initializing, userUid: user?.uid, getIdToken };

  const [state, setState] = useState<OuraReadinessRangeState>({ status: "partial" });
  const [bust, setBust] = useState(0);

  const fetchOnce = useCallback(async () => {
    const seq = ++requestSeq.current;
    const { initializing: init, userUid, getIdToken: getToken } = authRef.current;
    const safeSet = (next: OuraReadinessRangeState) => {
      if (seq === requestSeq.current) setState(next);
    };

    if (!enabled || init || !userUid || start == null || end == null || start > end) {
      safeSet({ status: "ready", days: [], start: (start ?? "") as DayKey, end: (end ?? "") as DayKey });
      return;
    }

    safeSet({ status: "partial" });
    const token = await getToken(false);
    if (!token || seq !== requestSeq.current) return;

    const res = await getOuraReadinessRange(token, start, end);
    if (seq !== requestSeq.current) return;

    if (!res.ok) {
      safeSet({
        status: "error",
        error: res.error ?? "Could not load readiness",
        days: [],
      });
      return;
    }

    safeSet({
      status: "ready",
      days: res.json.days,
      start,
      end,
    });
  }, [enabled, start, end]);

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, bust, user?.uid]);

  const refetch = useCallback((opts?: { cacheBust?: string }) => {
    void opts;
    setBust((n) => n + 1);
  }, []);

  return useMemo(() => ({ ...state, refetch }), [state, refetch]);
}
