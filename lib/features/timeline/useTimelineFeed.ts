// lib/features/timeline/useTimelineFeed.ts
// Cursor-accumulating Timeline feed hook. Issues GET /users/me/timeline-feed only.
// Resets on user switch / anchor change. Does not call multi-day /timeline aggregates.
// Display sections are ascending (oldest→newest); older pages load via top-boundary only.

import { useCallback, useEffect, useRef, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import type { TimelineFeedResponseDto, TimelinePresentationItem } from "@oli/contracts";
import type { FailureKind, GetOptions } from "@/lib/api/http";
import { getTimelineFeed } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getTodayDayKey } from "@/lib/time/dayKey";
import {
  canRequestOlderPage,
  groupSectionsAscending,
  mergeFeedPageItems,
  type TimelineFeedSection,
} from "@/lib/features/timeline/timelineFeedOrder";

export type { TimelineFeedSection };

export type UseTimelineFeedStatus =
  | { status: "partial" }
  | { status: "error"; error: string; requestId: string | null; reason: FailureKind }
  | {
      status: "ready";
      sections: TimelineFeedSection[];
      items: TimelinePresentationItem[];
      hasMore: boolean;
      loadingMore: boolean;
      isEmpty: boolean;
    };

export type UseTimelineFeedResult = {
  anchorDay: string;
  status: UseTimelineFeedStatus;
  /** Increments on hard reset (anchor / return-to-today / user switch / refetch). */
  listGeneration: number;
  setAnchorDay: (day: string) => void;
  returnToToday: () => void;
  /** Load one older cursor page (top-boundary). */
  loadOlder: () => void;
  refetch: (opts?: GetOptions) => void;
};

export function useTimelineFeed(initialAnchor?: string): UseTimelineFeedResult {
  const isFocused = useIsFocused();
  const { user, initializing, getIdToken } = useAuth();
  const today = getTodayDayKey();
  const [anchorDay, setAnchorDayState] = useState(() =>
    initialAnchor && /^\d{4}-\d{2}-\d{2}$/.test(initialAnchor) ? initialAnchor : today,
  );
  const [items, setItems] = useState<TimelinePresentationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listGeneration, setListGeneration] = useState(0);
  const [error, setError] = useState<{
    error: string;
    requestId: string | null;
    reason: FailureKind;
  } | null>(null);

  const genRef = useRef(0);
  const uidRef = useRef(user?.uid ?? null);
  const anchorRef = useRef(anchorDay);
  anchorRef.current = anchorDay;
  const loadingMoreRef = useRef(false);
  const inFlightOlderCursorRef = useRef<string | null>(null);

  const bumpListGeneration = useCallback(() => {
    setListGeneration((g) => g + 1);
  }, []);

  // User-switch reset
  useEffect(() => {
    const nextUid = user?.uid ?? null;
    if (uidRef.current !== nextUid) {
      uidRef.current = nextUid;
      setItems([]);
      setNextCursor(null);
      setHasMore(false);
      setError(null);
      setAnchorDayState(today);
      genRef.current += 1;
      inFlightOlderCursorRef.current = null;
      loadingMoreRef.current = false;
      bumpListGeneration();
    }
  }, [user?.uid, today, bumpListGeneration]);

  const fetchPage = useCallback(
    async (args: {
      anchor: string;
      cursor?: string | null;
      append: boolean;
      opts?: GetOptions;
    }) => {
      if (!isFocused || initializing) return;
      const gen = ++genRef.current;
      if (args.append) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        if (!user) {
          if (gen !== genRef.current) return;
          setError({ error: "Not signed in", requestId: null, reason: "unknown" });
          if (!args.append) setItems([]);
          return;
        }

        const token = await getIdToken(false);
        if (gen !== genRef.current) return;
        if (!token) {
          setError({ error: "No auth token", requestId: null, reason: "unknown" });
          if (!args.append) setItems([]);
          return;
        }

        const result = await getTimelineFeed(token, {
          anchorDay: args.anchor,
          ...(args.cursor ? { cursor: args.cursor } : {}),
          limit: 50,
          ...(args.opts?.cacheBust ? { cacheBust: args.opts.cacheBust } : {}),
        });
        if (gen !== genRef.current) return;

        if (!result.ok) {
          setError({
            error: result.error,
            requestId: result.requestId,
            reason: result.kind,
          });
          if (!args.append) setItems([]);
          return;
        }

        const page: TimelineFeedResponseDto = result.json;
        setItems((prev) => (args.append ? mergeFeedPageItems(prev, page.items) : page.items));
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        setError(null);
      } catch (e) {
        if (gen !== genRef.current) return;
        setError({
          error: e instanceof Error ? e.message : "Timeline feed failed",
          requestId: null,
          reason: "unknown",
        });
      } finally {
        if (gen === genRef.current) {
          setLoading(false);
          setLoadingMore(false);
          loadingMoreRef.current = false;
          if (args.append) {
            inFlightOlderCursorRef.current = null;
          }
        }
      }
    },
    [getIdToken, initializing, isFocused, user],
  );

  useEffect(() => {
    if (!isFocused || initializing) return;
    void fetchPage({ anchor: anchorDay, append: false });
  }, [anchorDay, fetchPage, initializing, isFocused]);

  const setAnchorDay = useCallback(
    (day: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
      setItems([]);
      setNextCursor(null);
      setHasMore(false);
      inFlightOlderCursorRef.current = null;
      setAnchorDayState(day);
      bumpListGeneration();
    },
    [bumpListGeneration],
  );

  const returnToToday = useCallback(() => {
    setItems([]);
    setNextCursor(null);
    setHasMore(false);
    inFlightOlderCursorRef.current = null;
    setAnchorDayState(today);
    bumpListGeneration();
  }, [today, bumpListGeneration]);

  const loadOlder = useCallback(() => {
    const cursor = nextCursor;
    if (
      !canRequestOlderPage({
        hasMore,
        nextCursor: cursor,
        loadingMore: loadingMoreRef.current || loadingMore,
        loading,
      })
    ) {
      return;
    }
    if (!cursor) return;
    if (inFlightOlderCursorRef.current === cursor) return;
    inFlightOlderCursorRef.current = cursor;
    void fetchPage({
      anchor: anchorRef.current,
      cursor,
      append: true,
    });
  }, [fetchPage, hasMore, loading, loadingMore, nextCursor]);

  const refetch = useCallback(
    (opts?: GetOptions) => {
      setItems([]);
      setNextCursor(null);
      inFlightOlderCursorRef.current = null;
      bumpListGeneration();
      // exactOptionalPropertyTypes: omit `opts` when absent (do not pass undefined).
      void fetchPage({
        anchor: anchorRef.current,
        append: false,
        ...(opts !== undefined ? { opts } : {}),
      });
    },
    [fetchPage, bumpListGeneration],
  );

  let status: UseTimelineFeedStatus;
  if (error && items.length === 0) {
    status = {
      status: "error",
      error: error.error,
      requestId: error.requestId,
      reason: error.reason,
    };
  } else if (loading && items.length === 0) {
    status = { status: "partial" };
  } else {
    status = {
      status: "ready",
      sections: groupSectionsAscending(items),
      items,
      hasMore,
      loadingMore,
      isEmpty: items.length === 0,
    };
  }

  return {
    anchorDay,
    status,
    listGeneration,
    setAnchorDay,
    returnToToday,
    loadOlder,
    refetch,
  };
}
