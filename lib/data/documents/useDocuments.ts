// lib/data/documents/useDocuments.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDocuments } from "@/lib/api/documents";
import type { DocumentDomain, DocumentsListResponseDto } from "@/lib/contracts";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { GetOptions } from "@/lib/api/http";

type State =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: DocumentsListResponseDto };

const EMPTY: DocumentsListResponseDto = { ok: true, items: [], nextCursor: null };

export type UseDocumentsOptions = {
  enabled?: boolean;
  domain?: DocumentDomain;
  limit?: number;
} & GetOptions;

export function useDocuments(opts?: UseDocumentsOptions): State & { refetch: (opts?: GetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const enabled = opts?.enabled ?? true;
  const domain = opts?.domain;
  const limit = opts?.limit;
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

      const query: GetOptions & { domain?: DocumentDomain; limit?: number } = {
        ...optsRef.current,
        ...refetchOpts,
      };
      if (domain) query.domain = domain;
      if (limit != null) query.limit = limit;

      const res = await getDocuments(token, query);
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
    [domain, enabled, getIdToken, initializing, limit, state.status, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, user?.uid, enabled, domain]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
