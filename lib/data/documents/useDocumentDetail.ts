// lib/data/documents/useDocumentDetail.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDocumentDetail } from "@/lib/api/documents";
import type { DocumentDetailResponseDto } from "@/lib/contracts";
import {
  isDocumentDeletedLocally,
  isDocumentDetailCleared,
  subscribeDocumentDeleted,
} from "@/lib/data/documents/documentListInvalidate";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { GetOptions } from "@/lib/api/http";

/**
 * Document detail request state.
 * Uses canonical readiness for in-flight (`partial`) and maps API 404 to explicit
 * `not_found` (consumer-safe missing document — not inferred from empty fields).
 * `idle` = hook disabled / no id. Never leave a rejected request in `partial`.
 */
export type DocumentDetailState = "idle" | "partial" | "ready" | "not_found" | "error";

type State =
  | { status: "idle" }
  | { status: "partial" }
  | { status: "not_found" }
  | { status: "error"; error: string; requestId: string | null }
  | { status: "ready"; data: DocumentDetailResponseDto };

/** @deprecated Prefer DocumentDetailState — kept as alias for transitional imports. */
export type UseDocumentDetailStatus = DocumentDetailState;

export type UseDocumentDetailOptions = { enabled?: boolean; documentId: string } & GetOptions;

export function useDocumentDetail(
  opts: UseDocumentDetailOptions,
): State & { refetch: (opts?: GetOptions) => void } {
  const { user, initializing, getIdToken } = useAuth();
  const enabled = opts.enabled ?? true;
  const documentId = opts.documentId;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const reqSeq = useRef(0);
  const stateRef = useRef<State>({ status: "idle" });
  const [state, setState] = useState<State>({ status: enabled && documentId ? "partial" : "idle" });

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

      if (!enabled || !documentId) {
        safeSet({ status: "idle" });
        return;
      }

      if (isDocumentDeletedLocally(documentId) || isDocumentDetailCleared(documentId)) {
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

      const res = await getDocumentDetail(token, documentId, { ...optsRef.current, ...refetchOpts });
      if (seq !== reqSeq.current) return;

      // Local delete may have raced while the request was in flight.
      if (isDocumentDeletedLocally(documentId) || isDocumentDetailCleared(documentId)) {
        safeSet({ status: "not_found" });
        return;
      }

      const outcome = truthOutcomeFromApiResult(res);
      if (outcome.status === "ready") {
        safeSet({ status: "ready", data: outcome.data });
        return;
      }
      if (outcome.status === "missing") {
        // Explicit API not-found → consumer not_found (do not infer from missing fields).
        safeSet({ status: "not_found" });
        return;
      }
      safeSet({ status: "error", error: outcome.error, requestId: outcome.requestId });
    },
    [documentId, enabled, getIdToken, initializing, setStateSafe, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, user?.uid, enabled, documentId]);

  useEffect(() => {
    return subscribeDocumentDeleted(({ documentId: deletedId }) => {
      if (deletedId !== documentId) return;
      ++reqSeq.current; // cancel in-flight
      setStateSafe({ status: "not_found" });
    });
  }, [documentId, setStateSafe]);

  return useMemo(() => ({ ...state, refetch: fetchOnce }), [state, fetchOnce]);
}
