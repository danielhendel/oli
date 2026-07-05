import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  computeActivityOverviewFetchDayKeys,
  computeShellActivityFetchDayKeys,
} from "@/lib/data/activity/activityOverviewRanges";
import { warnDashDataBudgetOnce } from "@/lib/dates/boundDayKeys";
import {
  useActivityStepsRollupForKeys,
  type ActivityStepsRollupHookState,
} from "@/lib/data/activity/useActivityStepsRollupMap";
import { getTodayDayKeyLocal } from "@/lib/ui/calendar/dateUtils";
import type { DayKey } from "@/lib/ui/calendar/types";

export type ActivityStepsRollupMapOptions = {
  /**
   * When `true` (default), this consumer’s `selectedDay` extends the shared key union beyond the
   * always-included today-anchored set (Activity weekly strip). Dash passes `false` so only the base
   * today union is used (still reads the same shared rollup state).
   */
  registerStripAnchor?: boolean;
};

type ActivityRollupContextValue = {
  rollupState: ActivityStepsRollupHookState;
  registerStripAnchor: (subscriberId: string, day: DayKey) => void;
  unregisterStripAnchor: (subscriberId: string) => void;
};

const ActivityRollupContext = createContext<ActivityRollupContextValue | null>(null);

function mergeUnionActivityDayKeys(stripAnchors: ReadonlyMap<string, DayKey>): DayKey[] {
  const today = getTodayDayKeyLocal();
  const set = new Set<DayKey>();
  for (const k of computeShellActivityFetchDayKeys(today)) {
    set.add(k);
  }
  for (const anchor of stripAnchors.values()) {
    for (const k of computeActivityOverviewFetchDayKeys(anchor, today)) {
      set.add(k);
    }
  }
  const keys = [...set].sort();
  if (stripAnchors.size === 0) {
    warnDashDataBudgetOnce("ActivityRollupProvider", keys.length);
  }
  return keys;
}

/**
 * Single shared Activity steps rollup (DailyFacts) for Dash + Activity overview.
 * Union key set = shell budget keys (today + week elapsed) ∪ full overview keys when an Activity
 * strip anchor is registered.
 */
export function ActivityRollupProvider({ children }: { children: ReactNode }) {
  const [stripAnchors, setStripAnchors] = useState(() => new Map<string, DayKey>());

  const registerStripAnchor = useCallback((subscriberId: string, day: DayKey) => {
    setStripAnchors((prev) => {
      if (prev.get(subscriberId) === day) return prev;
      const next = new Map(prev);
      next.set(subscriberId, day);
      return next;
    });
  }, []);

  const unregisterStripAnchor = useCallback((subscriberId: string) => {
    setStripAnchors((prev) => {
      if (!prev.has(subscriberId)) return prev;
      const next = new Map(prev);
      next.delete(subscriberId);
      return next;
    });
  }, []);

  const unionKeys = useMemo(() => mergeUnionActivityDayKeys(stripAnchors), [stripAnchors]);

  const rollupState = useActivityStepsRollupForKeys(unionKeys);

  const value = useMemo(
    () => ({
      rollupState,
      registerStripAnchor,
      unregisterStripAnchor,
    }),
    [rollupState, registerStripAnchor, unregisterStripAnchor],
  );

  return <ActivityRollupContext.Provider value={value}>{children}</ActivityRollupContext.Provider>;
}

/**
 * Shared Activity overview rollup: one underlying {@link useActivityStepsRollupForKeys} wave per app shell.
 * Must be used under {@link ActivityRollupProvider}.
 */
export function useActivityStepsRollupMap(
  selectedDay: DayKey,
  options?: ActivityStepsRollupMapOptions,
): ActivityStepsRollupHookState {
  const registerStripAnchorOpt = options?.registerStripAnchor ?? true;
  const ctx = useContext(ActivityRollupContext);
  if (ctx == null) {
    throw new Error("useActivityStepsRollupMap must be used within ActivityRollupProvider");
  }

  const reactId = useId();
  const subscriberId = useMemo(() => reactId.replace(/:/g, "_"), [reactId]);

  useEffect(() => {
    if (!registerStripAnchorOpt) return undefined;
    ctx.registerStripAnchor(subscriberId, selectedDay);
    return () => ctx.unregisterStripAnchor(subscriberId);
  }, [ctx, registerStripAnchorOpt, selectedDay, subscriberId]);

  return ctx.rollupState;
}
