// lib/data/body-scans/useBodyScans.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { getBodyScans } from "@/lib/api/bodyScans";
import type { BodyScansListResponseDto } from "@/lib/contracts";
import { subscribeDocumentDeleted } from "@/lib/data/documents/documentListInvalidate";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { GetOptions } from "@/lib/api/http";

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: BodyScansListResponseDto };

const EMPTY: BodyScansListResponseDto = { ok: true, items: [], nextCursor: null };

export type UseBodyScansOptions = { enabled?: boolean; limit?: number } & GetOptions;

export function useBodyScans(opts?: UseBodyScansOptions): State & {
  refetch: (opts?: GetOptions) => void;
} {
  const { user, initializing, getIdToken } = useAuth();
  const enabled = opts?.enabled ?? true;
  const limit = opts?.limit;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const reqSeq = useRef(0);
  const stateRef = useRef<State>({ status: "partial" });
  const [state, setState] = useState<State>({ status: "partial" });

  const setStateSafe = useCallback((next: State) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const fetchOnce = useCallback(
    async (refetchOpts?: GetOptions) => {
      const seq = ++reqSeq.current;
      const safeSet = (next: State) => {
        if (seq === reqSeq.current) setStateSafe(next);
      };

      if (!enabled) {
        safeSet({ status: "ready", data: EMPTY });
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

      // Keep the current list visible while refreshing; only block on first load.
      if (stateRef.current.status !== "ready") safeSet({ status: "partial" });

      const query: GetOptions & { limit?: number } = { ...optsRef.current, ...refetchOpts };
      if (limit != null) query.limit = limit;

      const res = await getBodyScans(token, query);
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
    [enabled, getIdToken, initializing, limit, setStateSafe, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, user?.uid, enabled]);

  // A scan shares its id with its source document, so a document delete removes it here too.
  useEffect(() => {
    return subscribeDocumentDeleted(({ documentId }) => {
      void fetchOnce({ cacheBust: `deleted-${documentId}-${Date.now()}` });
    });
  }, [fetchOnce]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
