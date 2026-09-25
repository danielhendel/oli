// lib/data/body-scans/useBodyScanDetail.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { getBodyScanDetail, getBodyScanReview } from "@/lib/api/bodyScans";
import type { BodyScanDetailResponseDto, BodyScanReviewResponseDto } from "@/lib/contracts";
import { isDocumentDeletedLocally } from "@/lib/data/documents/documentListInvalidate";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { ApiResult, GetOptions } from "@/lib/api/http";

type State<T> =
  | { status: "idle" }
  | { status: "partial" }
  | { status: "not_found" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: T };

function useBodyScanResource<T>(args: {
  scanId: string;
  enabled: boolean;
  load: (token: string, scanId: string, opts?: GetOptions) => Promise<ApiResult<T>>;
}): State<T> & { refetch: (opts?: GetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const { scanId, enabled, load } = args;
  const reqSeq = useRef(0);
  const stateRef = useRef<State<T>>({ status: "idle" });
  const [state, setState] = useState<State<T>>({
    status: enabled && scanId ? "partial" : "idle",
  });

  const setStateSafe = useCallback((next: State<T>) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const fetchOnce = useCallback(
    async (opts?: GetOptions) => {
      const seq = ++reqSeq.current;
      const safeSet = (next: State<T>) => {
        if (seq === reqSeq.current) setStateSafe(next);
      };

      if (!enabled || !scanId) {
        safeSet({ status: "idle" });
        return;
      }
      if (isDocumentDeletedLocally(scanId)) {
        safeSet({ status: "not_found" });
        return;
      }
      if (initializing || !user) {
        if (stateRef.current.status !== "ready") safeSet({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (seq !== reqSeq.current) return;
      if (!token) {
        safeSet({ status: "error", error: "No auth token", requestId: null });
        return;
      }

      if (stateRef.current.status !== "ready") safeSet({ status: "partial" });

      const res = await load(token, scanId, opts);
      if (seq !== reqSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);
      if (outcome.status === "ready") {
        safeSet({ status: "ready", data: outcome.data });
        return;
      }
      if (outcome.status === "missing") {
        safeSet({ status: "not_found" });
        return;
      }
      safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId });
    },
    [enabled, getIdToken, initializing, load, scanId, setStateSafe, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, user?.uid, enabled, scanId]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}

export function useBodyScanDetail(opts: { scanId: string; enabled?: boolean }) {
  return useBodyScanResource<BodyScanDetailResponseDto>({
    scanId: opts.scanId,
    enabled: opts.enabled ?? true,
    load: getBodyScanDetail,
  });
}

export function useBodyScanReview(opts: { scanId: string; enabled?: boolean }) {
  return useBodyScanResource<BodyScanReviewResponseDto>({
    scanId: opts.scanId,
    enabled: opts.enabled ?? true,
    load: getBodyScanReview,
  });
}
