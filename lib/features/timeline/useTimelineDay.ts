// lib/features/timeline/useTimelineDay.ts
// Composition hook for the single-day Timeline. Bounded selected-day cursor
// continuation for canonical + raw families; SleepNight / DailyFacts / Insights
// remain best-effort enrichments. Never GET /users/me/timeline-feed.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import type { FailureKind, GetOptions } from "@/lib/api/http";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSleepNight } from "@/lib/hooks/useSleepNight";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useInsights } from "@/lib/data/useInsights";
import { buildTimelineDayVm } from "@/lib/features/timeline/buildTimelineDayVm";
import { fetchTimelineDayEventsPages } from "@/lib/features/timeline/fetchTimelineDayEventsPages";
import { fetchTimelineDayRawEventsPages } from "@/lib/features/timeline/fetchTimelineDayRawEventsPages";
import type { CollectCursorPagesResult } from "@/lib/features/timeline/collectCursorPages";
import type {
  TimelineDayCompleteness,
  TimelineDayIncompletenessReason,
  TimelineDayStatus,
  TimelineDayVm,
} from "@/lib/features/timeline/types";
import type { CanonicalEventListItem, RawEventListItem } from "@oli/contracts";

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export type UseTimelineDayResult = {
  day: string;
  status: TimelineDayStatus;
  completeness: TimelineDayCompleteness;
  refetchAll: (opts?: GetOptions) => void;
};

type HistoryBundle = {
  events: CollectCursorPagesResult<CanonicalEventListItem>;
  raw: CollectCursorPagesResult<RawEventListItem>;
  requestId: string | null;
  failureReason: FailureKind;
};

function pickIncompletenessReason(
  events: CollectCursorPagesResult<CanonicalEventListItem>,
  raw: CollectCursorPagesResult<RawEventListItem>,
): TimelineDayIncompletenessReason {
  if (events.completeness === "partial") return events.reason;
  if (raw.completeness === "partial") return raw.reason;
  if (raw.completeness === "error") return raw.reason;
  if (events.completeness === "error") return events.reason;
  return "continuation_error";
}

function buildVm(args: {
  day: string;
  events: readonly CanonicalEventListItem[];
  raw: readonly RawEventListItem[];
  sleepView: ReturnType<typeof useSleepNight>["view"];
  facts: ReturnType<typeof useDailyFacts>;
  insights: ReturnType<typeof useInsights>;
}): TimelineDayVm {
  return buildTimelineDayVm({
    day: args.day,
    events: args.events,
    rawItems: args.raw,
    ...(args.sleepView ? { sleepNight: args.sleepView } : {}),
    ...(args.facts.status === "ready" ? { dailyFacts: args.facts.data } : {}),
    ...(args.insights.status === "ready" ? { insights: args.insights.data.items } : {}),
  });
}

/**
 * Orchestrates one day of timeline data with bounded cursor continuation.
 * Ready only when both paginated families prove completeness (nextCursor exhausted).
 */
export function useTimelineDay(day: string): UseTimelineDayResult {
  const isFocused = useIsFocused();
  const valid = YYYY_MM_DD.test(day);
  const enabled = isFocused && valid;
  const { user, initializing, getIdToken } = useAuth();
  const uid = user?.uid ?? null;

  const sleep = useSleepNight(day, { enabled });
  const facts = useDailyFacts(day, { enabled });
  const insights = useInsights(day);

  const generationRef = useRef(0);
  const getIdTokenRef = useRef(getIdToken);
  getIdTokenRef.current = getIdToken;
  const initializingRef = useRef(initializing);
  initializingRef.current = initializing;
  const hasUserRef = useRef(Boolean(user));
  hasUserRef.current = Boolean(user);

  const [history, setHistory] = useState<HistoryBundle | null>(null);
  const [historySettling, setHistorySettling] = useState(true);
  const [authError, setAuthError] = useState<{
    error: string;
    requestId: string | null;
    reason: FailureKind;
  } | null>(null);

  const loadHistory = useCallback(
    async (opts?: GetOptions) => {
      const generation = ++generationRef.current;
      const isCancelled = () => generation !== generationRef.current;

      setHistorySettling(true);
      setAuthError(null);
      // Drop prior-day actions immediately on day/user/retry generation change.
      setHistory(null);

      if (!enabled || !valid) {
        if (generation === generationRef.current) {
          setHistorySettling(false);
        }
        return;
      }

      if (initializingRef.current || !hasUserRef.current) {
        return;
      }

      const token = await getIdTokenRef.current(false);
      if (isCancelled()) return;

      if (!token) {
        setAuthError({ error: "No auth token", requestId: null, reason: "unknown" });
        setHistorySettling(false);
        return;
      }

      const [events, raw] = await Promise.all([
        fetchTimelineDayEventsPages({
          day,
          idToken: token,
          isCancelled,
          ...(opts ? { opts } : {}),
        }),
        fetchTimelineDayRawEventsPages({
          day,
          idToken: token,
          isCancelled,
          ...(opts ? { opts } : {}),
        }),
      ]);

      if (isCancelled()) return;

      setHistory({
        events,
        raw,
        requestId: null,
        failureReason: "unknown",
      });
      setHistorySettling(false);
    },
    [day, enabled, valid],
  );

  useEffect(() => {
    void loadHistory();
    return () => {
      generationRef.current += 1;
    };
  }, [loadHistory, uid]);

  const sleepRefetch = sleep.refetch;
  const factsRefetch = facts.refetch;
  const insightsRefetch = insights.refetch;

  const refetchAll = useCallback(
    (opts?: GetOptions) => {
      sleepRefetch(opts);
      factsRefetch(opts);
      insightsRefetch(opts);
      void loadHistory(opts);
    },
    [sleepRefetch, factsRefetch, insightsRefetch, loadHistory],
  );

  const { status, completeness } = useMemo((): {
    status: TimelineDayStatus;
    completeness: TimelineDayCompleteness;
  } => {
    if (!valid) {
      return {
        status: {
          status: "error",
          error: "Invalid day",
          requestId: null,
          reason: "unknown",
        },
        completeness: { state: "unavailable" },
      };
    }

    if (authError) {
      return {
        status: {
          status: "error",
          error: authError.error,
          requestId: authError.requestId,
          reason: authError.reason,
        },
        completeness: { state: "unavailable" },
      };
    }

    if (historySettling || history == null) {
      return {
        status: { status: "partial", history: "settling" },
        completeness: { state: "settling" },
      };
    }

    const { events, raw } = history;

    if (events.completeness === "error") {
      return {
        status: {
          status: "error",
          error: "Could not load timeline",
          requestId: history.requestId,
          reason: events.reason === "validation_error" ? "contract" : "unknown",
        },
        completeness: { state: "unavailable" },
      };
    }

    const vm = buildVm({
      day,
      events: events.items,
      raw: raw.completeness === "error" ? [] : raw.items,
      sleepView: sleep.view,
      facts,
      insights,
    });

    if (events.completeness === "complete" && raw.completeness === "complete") {
      return {
        status: { status: "ready", vm },
        completeness: { state: "complete" },
      };
    }

    const reason = pickIncompletenessReason(events, raw);
    return {
      status: {
        status: "partial",
        history: "incomplete",
        vm,
        incompletenessReason: reason,
      },
      completeness: { state: "unproven", reason },
    };
  }, [valid, authError, historySettling, history, day, sleep.view, facts, insights]);

  return { day, status, completeness, refetchAll };
}
