// lib/data/labs/useLabMetricDetail.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getLabMetricDetail } from "@/lib/api/labs";
import type { LabMetricDetailResponseDto } from "@/lib/contracts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { GetOptions } from "@/lib/api/http";

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: LabMetricDetailResponseDto };

export type UseLabMetricDetailOptions = { metricKey: string; enabled?: boolean } & GetOptions;

export function useLabMetricDetail(
  opts: UseLabMetricDetailOptions,
): State & { refetch: (opts?: GetOptions) => void } {
  const { metricKey, enabled = true } = opts;
  const { user, initializing, getIdToken } = useAuth();
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const reqSeq = useRef(0);
  const [state, setState] = useState<State>({ status: "partial" });

  const fetchOnce = useCallback(
    async (refetchOpts?: GetOptions) => {
      const seq = ++reqSeq.current;
      const safeSet = (next: State) => {
        if (seq === reqSeq.current) setState(next);
      };

      if (!enabled || !metricKey) {
        safeSet({ status: "partial" });
        return;
      }

      if (initializing || !user) {
        if (state.status !== "ready") safeSet({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (seq !== reqSeq.current) return;
      if (!token) {
        safeSet({ status: "error", error: "No auth token", requestId: null });
        return;
      }

      if (state.status !== "ready") safeSet({ status: "partial" });

      const res = await getLabMetricDetail(token, metricKey, { ...optsRef.current, ...refetchOpts });
      if (seq !== reqSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);
      if (outcome.status === "ready") {
        safeSet({ status: "ready", data: outcome.data });
        return;
      }
      if (outcome.status === "missing") {
        const catalogOnly: LabMetricDetailResponseDto = {
          ok: true,
          metricKey,
          displayName: metricKey,
          categoryKey: "unknown",
          preferredUnit: "",
          latest: null,
          history: [],
          referenceRangeText: null,
        };
        safeSet({ status: "ready", data: catalogOnly });
        return;
      }
      safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId });
    },
    [enabled, getIdToken, initializing, metricKey, state.status, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, user?.uid, metricKey, enabled]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
