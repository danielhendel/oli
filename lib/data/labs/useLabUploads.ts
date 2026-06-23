// lib/data/labs/useLabUploads.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getLabUploads } from "@/lib/api/labs";
import type { LabUploadsListResponseDto } from "@/lib/contracts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { GetOptions } from "@/lib/api/http";

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: LabUploadsListResponseDto };

const EMPTY: LabUploadsListResponseDto = { ok: true, items: [], nextCursor: null };

export type UseLabUploadsOptions = { enabled?: boolean } & GetOptions;

export function useLabUploads(opts?: UseLabUploadsOptions): State & { refetch: (opts?: GetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const enabled = opts?.enabled ?? true;
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

      if (!enabled) {
        safeSet({ status: "ready", data: EMPTY });
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

      const res = await getLabUploads(token, { ...optsRef.current, ...refetchOpts });
      if (seq !== reqSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);
      if (outcome.status === "ready") {
        safeSet({ status: "ready", data: outcome.data });
        return;
      }
      if (outcome.status === "missing") {
        safeSet({ status: "ready", data: EMPTY });
        return;
      }
      safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId });
    },
    [enabled, getIdToken, initializing, state.status, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, user?.uid, enabled]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
