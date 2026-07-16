// lib/features/timeline/useTimelineFeed.ts
// Cursor-accumulating Timeline feed hook. Issues GET /users/me/timeline-feed only.
// Resets on user switch / anchor change. Does not call multi-day /timeline aggregates.

import { useCallback, useEffect, useRef, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import type { TimelineFeedResponseDto, TimelinePresentationItem } from "@oli/contracts";
import type { FailureKind, GetOptions } from "@/lib/api/http";
import { getTimelineFeed } from "@/lib/api/usersMe";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getTodayDayKey } from "@/lib/time/dayKey";

export type TimelineFeedSection = {
  day: string;
  data: TimelinePresentationItem[];
};

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
  setAnchorDay: (day: string) => void;
  returnToToday: () => void;
  loadMore: () => void;
  refetch: (opts?: GetOptions) => void;
};

function groupSections(items: TimelinePresentationItem[]): TimelineFeedSection[] {
  const order: string[] = [];
  const map = new Map<string, TimelinePresentationItem[]>();
  for (const item of items) {
    if (!map.has(item.day)) {
      map.set(item.day, []);
      order.push(item.day);
    }
    map.get(item.day)!.push(item);
  }
  return order.map((day) => ({ day, data: map.get(day)! }));
}

function mergeItems(
  prev: TimelinePresentationItem[],
  next: TimelinePresentationItem[],
): TimelinePresentationItem[] {
  const seen = new Set(prev.map((i) => i.dedupeKey));
  const out = [...prev];
  for (const item of next) {
    if (seen.has(item.dedupeKey)) continue;
    seen.add(item.dedupeKey);
    out.push(item);
  }
  return out;
}

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
  const [error, setError] = useState<{
    error: string;
    requestId: string | null;
    reason: FailureKind;
  } | null>(null);

  const genRef = useRef(0);
  const uidRef = useRef(user?.uid ?? null);
  const anchorRef = useRef(anchorDay);
  anchorRef.current = anchorDay;

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
    }
  }, [user?.uid, today]);

  const fetchPage = useCallback(
    async (args: {
      anchor: string;
      cursor?: string | null;
      append: boolean;
      opts?: GetOptions;
    }) => {
      if (!isFocused || initializing) return;
      const gen = ++genRef.current;
      if (args.append) setLoadingMore(true);
      else {
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
        setItems((prev) => (args.append ? mergeItems(prev, page.items) : page.items));
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
        }
      }
    },
    [getIdToken, initializing, isFocused, user],
  );

  useEffect(() => {
    if (!isFocused || initializing) return;
    void fetchPage({ anchor: anchorDay, append: false });
  }, [anchorDay, fetchPage, initializing, isFocused]);

  const setAnchorDay = useCallback((day: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
    setItems([]);
    setNextCursor(null);
    setHasMore(false);
    setAnchorDayState(day);
  }, []);

  const returnToToday = useCallback(() => {
    setItems([]);
    setNextCursor(null);
    setHasMore(false);
    setAnchorDayState(today);
  }, [today]);

  const loadMore = useCallback(() => {
    if (!hasMore || !nextCursor || loadingMore || loading) return;
    void fetchPage({
      anchor: anchorRef.current,
      cursor: nextCursor,
      append: true,
    });
  }, [fetchPage, hasMore, loading, loadingMore, nextCursor]);

  const refetch = useCallback(
    (opts?: GetOptions) => {
      setItems([]);
      setNextCursor(null);
      // exactOptionalPropertyTypes: omit `opts` when absent (do not pass undefined).
      void fetchPage({
        anchor: anchorRef.current,
        append: false,
        ...(opts !== undefined ? { opts } : {}),
      });
    },
    [fetchPage],
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
      sections: groupSections(items),
      items,
      hasMore,
      loadingMore,
      isEmpty: items.length === 0,
    };
  }

  return {
    anchorDay,
    status,
    setAnchorDay,
    returnToToday,
    loadMore,
    refetch,
  };
}
