// lib/data/body-scans/useBodyScanCategoryHistory.ts
/**
 * Category history: owner-scoped filtered cursor pagination.
 * Never uses a mixed global page as the authoritative source.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { getBodyScans } from "@/lib/api/bodyScans";
import type { BodyScanListItemDto, BodyScanType } from "@/lib/contracts";
import {
  BODY_SCAN_LIST_DEFAULT_LIMIT,
  mergeBodyScanHistoryPages,
} from "@/lib/data/body-scans/groupBodyScansByCategory";
import { mayClaimCategoryEmpty } from "@/lib/data/body-scans/bodyScanCategorySummary";
import { subscribeDocumentDeleted } from "@/lib/data/documents/documentListInvalidate";
import { truthOutcomeFromApiResult } from "@/lib/data/truthOutcome";
import type { GetOptions } from "@/lib/api/http";

type HistoryState =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null }
  | {
      status: "ready";
      items: BodyScanListItemDto[];
      nextCursor: string | null;
      hasMore: boolean;
    };

export type UseBodyScanCategoryHistoryOptions = {
  scanType: BodyScanType;
  enabled?: boolean;
  limit?: number;
} & GetOptions;

export function useBodyScanCategoryHistory(opts: UseBodyScanCategoryHistoryOptions): HistoryState & {
  refetch: (opts?: GetOptions) => void;
  loadMore: () => void;
  loadingMore: boolean;
  loadMoreError: string | null;
  isProvenEmpty: boolean;
} {
  const { user, initializing, getIdToken } = useAuth();
  const enabled = opts.enabled ?? true;
  const scanType = opts.scanType;
  const limit = opts.limit ?? BODY_SCAN_LIST_DEFAULT_LIMIT;
  const reqSeq = useRef(0);
  const stateRef = useRef<HistoryState>({ status: "partial" });
  const [state, setState] = useState<HistoryState>({ status: "partial" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const setStateSafe = useCallback((next: HistoryState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const fetchFirst = useCallback(
    async (refetchOpts?: GetOptions) => {
      const seq = ++reqSeq.current;
      setLoadMoreError(null);
      if (!enabled) {
        if (seq === reqSeq.current) {
          setStateSafe({
            status: "ready",
            items: [],
            nextCursor: null,
            hasMore: false,
          });
        }
        return;
      }
      if (initializing || !user) {
        if (stateRef.current.status !== "ready") setStateSafe({ status: "partial" });
        return;
      }

      const token = await getIdToken(false);
      if (seq !== reqSeq.current) return;
      if (!token) {
        setStateSafe({ status: "error", error: "No auth token", requestId: null });
        return;
      }

      if (stateRef.current.status !== "ready") setStateSafe({ status: "partial" });

      const res = await getBodyScans(token, {
        scanType,
        limit,
        ...refetchOpts,
      });
      if (seq !== reqSeq.current) return;

      const outcome = truthOutcomeFromApiResult(res);
      if (outcome.status === "ready") {
        setStateSafe({
          status: "ready",
          items: [...outcome.data.items],
          nextCursor: outcome.data.nextCursor,
          hasMore: outcome.data.hasMore,
        });
        return;
      }
      if (outcome.status === "missing") {
        setStateSafe({
          status: "ready",
          items: [],
          nextCursor: null,
          hasMore: false,
        });
        return;
      }
      setStateSafe({ status: "error", error: outcome.error, requestId: outcome.requestId });
    },
    [enabled, getIdToken, initializing, limit, scanType, setStateSafe, user],
  );

  const loadMore = useCallback(() => {
    void (async () => {
      const current = stateRef.current;
      if (current.status !== "ready" || !current.hasMore || !current.nextCursor) return;
      if (loadingMore) return;
      if (!user || initializing) return;

      setLoadingMore(true);
      setLoadMoreError(null);
      const token = await getIdToken(false);
      if (!token) {
        setLoadMoreError("No auth token");
        setLoadingMore(false);
        return;
      }

      const res = await getBodyScans(token, {
        scanType,
        limit,
        cursor: current.nextCursor,
        cacheBust: `more:${scanType}:${Date.now()}`,
      });
      const outcome = truthOutcomeFromApiResult(res);
      setLoadingMore(false);

      if (outcome.status !== "ready") {
        setLoadMoreError(outcome.status === "missing" ? "Could not load more" : outcome.error);
        return;
      }

      const merged = mergeBodyScanHistoryPages([current.items, outcome.data.items]);
      setStateSafe({
        status: "ready",
        items: merged,
        nextCursor: outcome.data.nextCursor,
        hasMore: outcome.data.hasMore,
      });
    })();
  }, [getIdToken, initializing, limit, loadingMore, scanType, setStateSafe, user]);

  useEffect(() => {
    void fetchFirst();
  }, [fetchFirst, user?.uid, enabled, scanType]);

  useEffect(() => {
    return subscribeDocumentDeleted(({ documentId }) => {
      void fetchFirst({ cacheBust: `deleted-${documentId}-${Date.now()}` });
    });
  }, [fetchFirst]);

  const isProvenEmpty = useMemo(() => {
    if (state.status !== "ready") return false;
    return mayClaimCategoryEmpty({
      items: state.items,
      hasMore: state.hasMore,
      nextCursor: state.nextCursor,
    });
  }, [state]);

  return {
    ...state,
    refetch: fetchFirst,
    loadMore,
    loadingMore,
    loadMoreError,
    isProvenEmpty,
  };
}
