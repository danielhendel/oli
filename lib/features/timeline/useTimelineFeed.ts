// lib/features/timeline/useTimelineFeed.ts
// Cursor-accumulating Timeline feed hook. Issues GET /users/me/timeline-feed only.
// Resets on user switch / hard refetch. Display sections are ascending (oldest→newest);
// older pages load via top-boundary only. Calendar jumps keep the Today-rooted pages.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  MAX_ENSURE_DAY_OLDER_PAGES,
  canRequestEnsureDayPage,
  dayIsLoaded,
  nextEnsureDayPageCount,
  type FeedScrollTarget,
} from "@/lib/features/timeline/timelineFeedScrollIntent";

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
  /** Data-fetch anchor — stays on Today for continuous-feed continuity. */
  anchorDay: string;
  /** Calendar highlight / jump focus (may differ from data anchor). */
  selectedDay: string;
  status: UseTimelineFeedStatus;
  /** Intentional scroll target for the list (cold open / Return to Today / calendar). */
  scrollTarget: FeedScrollTarget;
  onScrollTargetSettled: (id: number) => void;
  /** Calendar jump: scroll when loaded; otherwise load bounded older pages without discarding newer. */
  jumpToDay: (day: string) => void;
  returnToToday: () => void;
  /** Load one older cursor page (top-boundary). */
  loadOlder: () => void;
  refetch: (opts?: GetOptions) => void;
  ensuringDay: boolean;
  ensureDayError: string | null;
};

export function useTimelineFeed(initialAnchor?: string): UseTimelineFeedResult {
  const isFocused = useIsFocused();
  const { user, initializing, getIdToken } = useAuth();
  const today = getTodayDayKey();
  // Continuous feed always fetches from Today; initialAnchor only seeds selectedDay.
  const [anchorDay] = useState(today);
  const [selectedDay, setSelectedDay] = useState(() =>
    initialAnchor && /^\d{4}-\d{2}-\d{2}$/.test(initialAnchor) ? initialAnchor : today,
  );
  const [items, setItems] = useState<TimelinePresentationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ensuringDay, setEnsuringDay] = useState(false);
  const [ensureDayError, setEnsureDayError] = useState<string | null>(null);
  const [scrollTarget, setScrollTarget] = useState<FeedScrollTarget>({
    id: 1,
    mode: "newest",
  });
  const [error, setError] = useState<{
    error: string;
    requestId: string | null;
    reason: FailureKind;
  } | null>(null);

  const genRef = useRef(0);
  const uidRef = useRef(user?.uid ?? null);
  const loadingMoreRef = useRef(false);
  const inFlightOlderCursorRef = useRef<string | null>(null);
  const scrollIdRef = useRef(1);
  const ensureGenRef = useRef(0);
  const ensureTargetDayRef = useRef<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const nextCursorRef = useRef(nextCursor);
  nextCursorRef.current = nextCursor;

  const bumpScrollTarget = useCallback((partial: Omit<FeedScrollTarget, "id">) => {
    scrollIdRef.current += 1;
    setScrollTarget({ id: scrollIdRef.current, ...partial });
  }, []);

  const onScrollTargetSettled = useCallback(() => {
    // Settled markers live in the list; no-op hook side for now.
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
      setSelectedDay(today);
      setEnsureDayError(null);
      setEnsuringDay(false);
      ensureGenRef.current += 1;
      ensureTargetDayRef.current = null;
      genRef.current += 1;
      inFlightOlderCursorRef.current = null;
      loadingMoreRef.current = false;
      bumpScrollTarget({ mode: "newest" });
    }
  }, [user?.uid, today, bumpScrollTarget]);

  const fetchPage = useCallback(
    async (args: {
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
          anchorDay: today,
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
    [getIdToken, initializing, isFocused, today, user],
  );

  useEffect(() => {
    if (!isFocused || initializing) return;
    void fetchPage({ append: false });
  }, [fetchPage, initializing, isFocused]);

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
      cursor,
      append: true,
    });
  }, [fetchPage, hasMore, loading, loadingMore, nextCursor]);

  const jumpToDay = useCallback(
    (day: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
      setSelectedDay(day);
      setEnsureDayError(null);

      const sections = groupSectionsAscending(itemsRef.current);
      if (dayIsLoaded(sections, day)) {
        bumpScrollTarget({ mode: "day", day });
        return;
      }

      // Bounded ensure-day-loaded: keep Today-rooted pages, append older until found.
      const ensureGen = ++ensureGenRef.current;
      ensureTargetDayRef.current = day;
      setEnsuringDay(true);
      bumpScrollTarget({ mode: "day", day });

      void (async () => {
        let pagesRequested = 0;
        try {
          while (ensureGen === ensureGenRef.current) {
            const currentSections = groupSectionsAscending(itemsRef.current);
            if (dayIsLoaded(currentSections, day)) {
              bumpScrollTarget({ mode: "day", day });
              return;
            }
            if (
              !canRequestEnsureDayPage({
                pagesRequested,
                maxPages: MAX_ENSURE_DAY_OLDER_PAGES,
                hasMore: hasMoreRef.current,
                targetLoaded: false,
              })
            ) {
              setEnsureDayError("That day is not in the loaded Timeline range yet.");
              return;
            }
            const cursor = nextCursorRef.current;
            if (!cursor) {
              setEnsureDayError("That day is not in the loaded Timeline range yet.");
              return;
            }
            if (inFlightOlderCursorRef.current === cursor) {
              return;
            }
            inFlightOlderCursorRef.current = cursor;
            pagesRequested = nextEnsureDayPageCount(pagesRequested);
            await fetchPage({ cursor, append: true });
            if (ensureGen !== ensureGenRef.current) return;
          }
        } finally {
          if (ensureGen === ensureGenRef.current) {
            setEnsuringDay(false);
            ensureTargetDayRef.current = null;
          }
        }
      })();
    },
    [bumpScrollTarget, fetchPage],
  );

  const returnToToday = useCallback(() => {
    ensureGenRef.current += 1;
    ensureTargetDayRef.current = null;
    setEnsuringDay(false);
    setEnsureDayError(null);
    setSelectedDay(today);
    // Keep loaded pages; only re-target the newest section.
    bumpScrollTarget({ mode: "newest" });
  }, [today, bumpScrollTarget]);

  const refetch = useCallback(
    (opts?: GetOptions) => {
      ensureGenRef.current += 1;
      ensureTargetDayRef.current = null;
      setEnsuringDay(false);
      setEnsureDayError(null);
      setItems([]);
      setNextCursor(null);
      inFlightOlderCursorRef.current = null;
      bumpScrollTarget({ mode: "newest" });
      void fetchPage({
        append: false,
        ...(opts !== undefined ? { opts } : {}),
      });
    },
    [fetchPage, bumpScrollTarget],
  );

  const sections = useMemo(() => groupSectionsAscending(items), [items]);

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
      sections,
      items,
      hasMore,
      loadingMore: loadingMore || ensuringDay,
      isEmpty: items.length === 0,
    };
  }

  return {
    anchorDay,
    selectedDay,
    status,
    scrollTarget,
    onScrollTargetSettled,
    jumpToDay,
    returnToToday,
    loadOlder,
    refetch,
    ensuringDay,
    ensureDayError,
  };
}
