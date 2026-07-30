// lib/data/documents/useDocuments.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getDocuments } from "@/lib/api/documents";
import type { DocumentDomain, DocumentListItemDto, DocumentsListResponseDto } from "@/lib/contracts";
import {
  filterOutDeletedDocuments,
  subscribeDocumentDeleted,
} from "@/lib/data/documents/documentListInvalidate";
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

function withDeletedFilter(data: DocumentsListResponseDto): DocumentsListResponseDto {
  return {
    ...data,
    items: filterOutDeletedDocuments(data.items),
  };
}

export function useDocuments(opts?: UseDocumentsOptions): State & {
  refetch: (opts?: GetOptions) => void;
  removeLocalDocument: (documentId: string) => void;
} {
  const { user, initializing, getIdToken } = useAuth();
  const enabled = opts?.enabled ?? true;
  const domain = opts?.domain;
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

  const removeLocalDocument = useCallback((documentId: string) => {
    const current = stateRef.current;
    if (current.status !== "ready") return;
    const items = current.data.items.filter((item: DocumentListItemDto) => item.id !== documentId);
    if (items.length === current.data.items.length) return;
    setStateSafe({
      status: "ready",
      data: { ...current.data, items },
    });
  }, [setStateSafe]);

  const fetchOnce = useCallback(
    async (refetchOpts?: GetOptions) => {
      const seq = ++reqSeq.current;
      const safeSet = (next: State) => {
        if (seq !== reqSeq.current) return;
        if (next.status === "ready") {
          setStateSafe({ status: "ready", data: withDeletedFilter(next.data) });
          return;
        }
        setStateSafe(next);
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

      // Keep showing ready list while refreshing; only show loading on first load.
      if (stateRef.current.status !== "ready") safeSet({ status: "partial" });

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
    [domain, enabled, getIdToken, initializing, limit, setStateSafe, user],
  );

  useEffect(() => {
    void fetchOnce();
  }, [fetchOnce, user?.uid, enabled, domain]);

  useEffect(() => {
    return subscribeDocumentDeleted(({ documentId }) => {
      removeLocalDocument(documentId);
      // Bounded background refetch so server truth converges without restoring tombstones.
      void fetchOnce({ cacheBust: `deleted-${documentId}-${Date.now()}` });
    });
  }, [fetchOnce, removeLocalDocument]);

  return useMemo(
    () => ({ ...state, refetch: fetchOnce, removeLocalDocument }),
    [state, fetchOnce, removeLocalDocument],
  );
}
