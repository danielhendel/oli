import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { getWorkoutMonthSummaries } from "@/lib/api/usersMe";
import type { WorkoutMonthSummaryItemDto } from "@/lib/contracts/retrieval";

/**
 * Gated, cached prior-year fetcher for the Yearly Strength card.
 *
 * Behavior:
 * - When `year` is `null` (the displayed year equals the current year), no request fires —
 *   the screen aggregates from the already-hydrated `overviewSharedRange.days` in-memory.
 * - When `year` is a 4-digit prior year, a single `GET /users/me/workout-month-summaries?year=YYYY`
 *   call fires the first time that year is requested; results are cached in a `useRef` map
 *   keyed by `${uid}::${year}` so subsequent prev/next toggles to the same year hit cache.
 * - Errors surface as `status: "error"` with `items: []` — the card renders an empty state.
 *
 * Important: `setState` reuses the cached entry's object identity on cache hits so re-renders
 * caused by parent state changes (or test mocks that hand out fresh `user`/`getIdToken` refs each
 * render) do not allocate new state objects and cause render loops. The effect therefore depends
 * only on stable scalars (`year`, `uid`).
 *
 * No new APIs are introduced — this hook only consumes the existing `getWorkoutMonthSummaries`
 * client wrapper that's already part of `lib/api/usersMe.ts`.
 */
export type StrengthYearlyMonthSummariesStatus = "idle" | "partial" | "ready" | "error";

export type StrengthYearlyMonthSummariesState = {
  status: StrengthYearlyMonthSummariesStatus;
  items: readonly WorkoutMonthSummaryItemDto[];
  /** True iff the server reported all 12 months are present for this year. */
  complete: boolean;
};

type CachedEntry = {
  state: StrengthYearlyMonthSummariesState;
};

const IDLE_STATE: StrengthYearlyMonthSummariesState = {
  status: "idle",
  items: [],
  complete: false,
};

const PARTIAL_STATE: StrengthYearlyMonthSummariesState = {
  status: "partial",
  items: [],
  complete: false,
};

export function useStrengthYearlyMonthSummaries(
  year: number | null,
): StrengthYearlyMonthSummariesState {
  const { user, getIdToken } = useAuth();
  const uid = user?.uid ?? null;
  const getIdTokenRef = useRef(getIdToken);
  getIdTokenRef.current = getIdToken;
  const cacheRef = useRef<Map<string, CachedEntry>>(new Map());
  const requestSeqRef = useRef(0);
  const [state, setState] = useState<StrengthYearlyMonthSummariesState>(IDLE_STATE);

  useEffect(() => {
    if (year == null) {
      setState(IDLE_STATE);
      return;
    }
    if (!uid) {
      setState(IDLE_STATE);
      return;
    }
    const cacheKey = `${uid}::${year}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setState(cached.state);
      return;
    }

    const seq = ++requestSeqRef.current;
    setState(PARTIAL_STATE);

    let cancelled = false;
    (async () => {
      try {
        const token = await getIdTokenRef.current();
        if (cancelled) return;
        if (!token) {
          if (requestSeqRef.current !== seq) return;
          const entry: CachedEntry = {
            state: { status: "error", items: [], complete: false },
          };
          cacheRef.current.set(cacheKey, entry);
          setState(entry.state);
          return;
        }
        const res = await getWorkoutMonthSummaries(token, { year });
        if (cancelled || requestSeqRef.current !== seq) return;
        if (!res.ok || !res.json) {
          const entry: CachedEntry = {
            state: { status: "error", items: [], complete: false },
          };
          cacheRef.current.set(cacheKey, entry);
          setState(entry.state);
          return;
        }
        const entry: CachedEntry = {
          state: {
            status: "ready",
            items: res.json.items,
            complete: res.json.complete,
          },
        };
        cacheRef.current.set(cacheKey, entry);
        setState(entry.state);
      } catch {
        if (cancelled || requestSeqRef.current !== seq) return;
        const entry: CachedEntry = {
          state: { status: "error", items: [], complete: false },
        };
        cacheRef.current.set(cacheKey, entry);
        setState(entry.state);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [year, uid]);

  return state;
}
