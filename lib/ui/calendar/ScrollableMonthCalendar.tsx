import React, { useCallback, useEffect, useRef } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
  type ViewToken,
} from "react-native";

import { clampMonthYear, type MonthYear } from "@/lib/ui/calendar/dateUtils";
import { headerYearFromViewableMonthItems } from "@/lib/ui/calendar/moduleCalendarHeaderYear";

export type ScrollableCalendarMonth = {
  key: string;
  monthYear: MonthYear;
};

/** Canonical Sleep / Workouts / Activity / Timeline visible month window. */
export const CANONICAL_CALENDAR_MONTHS_BACK = 12;
export const CANONICAL_CALENDAR_MONTHS_FORWARD = 12;

function shiftMonth(monthYear: MonthYear, delta: number): MonthYear {
  return clampMonthYear({ year: monthYear.year, month: monthYear.month + delta });
}

/**
 * Visible month sections for the shared scrollable calendar (±12 around center).
 * Selection bounds (`minDay` / `maxDay` on MonthGrid) are separate and must not
 * truncate this list.
 */
export function buildCanonicalScrollableMonths(
  center: MonthYear,
): ScrollableCalendarMonth[] {
  const out: ScrollableCalendarMonth[] = [];
  for (
    let offset = -CANONICAL_CALENDAR_MONTHS_BACK;
    offset <= CANONICAL_CALENDAR_MONTHS_FORWARD;
    offset += 1
  ) {
    const monthYear = shiftMonth(center, offset);
    out.push({
      key: `${monthYear.year}-${String(monthYear.month).padStart(2, "0")}`,
      monthYear,
    });
  }
  return out;
}

export type ScrollableMonthCalendarProps<T extends ScrollableCalendarMonth> = {
  months: readonly T[];
  initialMonthIndex: number;
  renderMonth: (item: T) => React.ReactElement;
  onVisibleRangeChange?: (startIndex: number, endIndex: number, headerYear: number) => void;
  contentBottomPadding?: number;
  ListFooterComponent?: React.ReactElement | null;
  /**
   * When set, remounts the list so `initialScrollIndex` re-applies (e.g. Timeline
   * sheet open / selected-day change). Consumer-specific; Sleep/Workouts omit.
   */
  remountKey?: string;
  testID?: string;
};

/**
 * Must be >= measured MonthGrid height so getItemLayout never underscrolls.
 * Underscroll clips the preceding month heading under the viewport top.
 *
 * MonthGrid budget:
 * paddingTop 10 + title(~28)+margin 14 + dow(~18)+margin 10 +
 * 6*(minHeight 44 + margin 5) + paddingBottom 4 ≈ 378.
 */
export const CALENDAR_MONTH_ITEM_HEIGHT = 400;

export const SCROLLABLE_CALENDAR_MAX_SCROLL_RETRIES = 3;

export function findScrollableMonthIndex(
  months: readonly ScrollableCalendarMonth[],
  target: MonthYear,
): number {
  const index = months.findIndex(
    (item) => item.monthYear.year === target.year && item.monthYear.month === target.month,
  );
  return Math.max(0, index);
}

/**
 * Canonical Oli vertically scrollable calendar shell used by Sleep, Workouts,
 * Timeline, and Activity. Data fetching and date-selection stay in each caller.
 */
export function ScrollableMonthCalendar<T extends ScrollableCalendarMonth>({
  months,
  initialMonthIndex,
  renderMonth,
  onVisibleRangeChange,
  contentBottomPadding = 32,
  ListFooterComponent,
  remountKey,
  testID,
}: ScrollableMonthCalendarProps<T>) {
  const listRef = useRef<FlatList<T>>(null);
  const retryCountRef = useRef(0);
  const clampedIndex = Math.min(
    Math.max(0, initialMonthIndex),
    Math.max(0, months.length - 1),
  );

  useEffect(() => {
    retryCountRef.current = 0;
    if (process.env.JEST_WORKER_ID) return;
    if (months.length === 0) return;
    const id = requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: clampedIndex,
        animated: false,
        viewPosition: 0,
      });
    });
    return () => cancelAnimationFrame(id);
  }, [clampedIndex, months.length, remountKey]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!onVisibleRangeChange || viewableItems.length === 0) return;
      const indices = viewableItems
        .map((token) => token.index)
        .filter((index): index is number => typeof index === "number")
        .sort((a, b) => a - b);
      const first = indices[0];
      const last = indices[indices.length - 1];
      if (first == null || last == null) return;
      const headerYear = headerYearFromViewableMonthItems(viewableItems, months);
      if (headerYear == null) return;
      onVisibleRangeChange(first, last, headerYear);
    },
    [months, onVisibleRangeChange],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 20,
  }).current;

  const onScrollToIndexFailed = useCallback(
    (info: { index: number }) => {
      if (retryCountRef.current >= SCROLLABLE_CALENDAR_MAX_SCROLL_RETRIES) {
        listRef.current?.scrollToOffset({
          offset: info.index * CALENDAR_MONTH_ITEM_HEIGHT,
          animated: false,
        });
        return;
      }
      retryCountRef.current += 1;
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({
          index: info.index,
          animated: false,
          viewPosition: 0,
        });
      });
    },
    [],
  );

  return (
    <FlatList
      key={remountKey}
      ref={listRef}
      testID={testID}
      style={styles.list}
      data={months as T[]}
      keyExtractor={(item) => item.key}
      contentContainerStyle={{ paddingBottom: contentBottomPadding }}
      initialScrollIndex={clampedIndex}
      initialNumToRender={5}
      maxToRenderPerBatch={6}
      windowSize={7}
      getItemLayout={(_, index) => ({
        length: CALENDAR_MONTH_ITEM_HEIGHT,
        offset: CALENDAR_MONTH_ITEM_HEIGHT * index,
        index,
      })}
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
      onScrollToIndexFailed={onScrollToIndexFailed}
      ListFooterComponent={ListFooterComponent}
      {...(Platform.OS === "ios"
        ? { contentInsetAdjustmentBehavior: "never" as const }
        : {})}
      renderItem={({ item }) => (
        <View
          style={styles.monthItem}
          testID={`scrollable-calendar-month-${item.key}`}
        >
          {renderMonth(item)}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  monthItem: {
    height: CALENDAR_MONTH_ITEM_HEIGHT,
    overflow: "hidden",
  },
});
