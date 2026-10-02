// lib/data/body-scans/useBodyScanCategoryHistory.ts
/**
 * Category history: owner-scoped filtered cursor pagination.
 * Never uses a mixed global page as the authoritative source.
 * Invalidation resets to first page (cursor null) — never appends onto stale pages.
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
import {
  bodyScanListInvalidationAffects,
  subscribeBodyScanListInvalidation,
} from "@/lib/data/body-scans/bodyScanListInvalidate";
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

export type BodyScanCategoryHistoryRefetchOptions = GetOptions & {
  /** Clear prior pages before the first page load (invalidation / focus). */
  resetPages?: boolean;
};

export function useBodyScanCategoryHistory(opts: UseBodyScanCategoryHistoryOptions): HistoryState & {
  refetch: (opts?: BodyScanCategoryHistoryRefetchOptions) => void;
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
  const accountRef = useRef<string | null>(null);
  accountRef.current = user?.uid ?? null;
  const stateRef = useRef<HistoryState>({ status: "partial" });
  const [state, setState] = useState<HistoryState>({ status: "partial" });
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const setStateSafe = useCallback((next: HistoryState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const fetchFirst = useCallback(
    async (refetchOpts?: BodyScanCategoryHistoryRefetchOptions) => {
      const seq = ++reqSeq.current;
      const accountAtStart = accountRef.current;
      setLoadMoreError(null);
      setLoadingMore(false);
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
      if (accountRef.current !== accountAtStart) return;
      if (!token) {
        setStateSafe({ status: "error", error: "No auth token", requestId: null });
        return;
      }

      // Invalidation / explicit reset: clear stale pages so we never append to them,
      // and never claim empty/end-of-history while refetching.
      if (refetchOpts?.resetPages || stateRef.current.status !== "ready") {
        setStateSafe({ status: "partial" });
      }

      const getOpts = refetchOpts
        ? {
            ...(refetchOpts.cacheBust != null ? { cacheBust: refetchOpts.cacheBust } : {}),
            ...(refetchOpts.noStore != null ? { noStore: refetchOpts.noStore } : {}),
            ...(refetchOpts.timeoutMs != null ? { timeoutMs: refetchOpts.timeoutMs } : {}),
          }
        : {};
      const res = await getBodyScans(token, {
        scanType,
        limit,
        // First page only — never reuse a stale cursor after invalidation.
        ...getOpts,
      });
      if (seq !== reqSeq.current) return;
      if (accountRef.current !== accountAtStart) return;

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
    [enabled, getIdToken, initializing, limit, scanType, setStateSafe, user?.uid],
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
  }, [getIdToken, initializing, limit, loadingMore, scanType, setStateSafe, user?.uid]);

  useEffect(() => {
    void fetchFirst();
  }, [fetchFirst, user?.uid, enabled, scanType]);

  useEffect(() => {
    return subscribeBodyScanListInvalidation((event) => {
      if (!bodyScanListInvalidationAffects(event, scanType)) return;
      void fetchFirst({
        resetPages: true,
        cacheBust: `invalidate:${event.reason}:${Date.now()}`,
      });
    });
  }, [fetchFirst, scanType]);

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
