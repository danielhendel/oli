// lib/ui/timeline/TimelineFeedList.tsx
// Continuous SectionList feed: oldest→newest sections, Today at bottom,
// older history loaded at the top boundary with visible-position preservation.
// Shares TimelineRailRow with the single-day fallback.
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type SectionListRenderItemInfo,
} from "react-native";
import type { TimelinePresentationItem } from "@oli/contracts";
import type { TimelineFeedSection } from "@/lib/features/timeline/timelineFeedOrder";
import {
  MAX_FEED_SCROLL_RETRIES,
  resolveScrollLocation,
  type FeedScrollTarget,
} from "@/lib/features/timeline/timelineFeedScrollIntent";
import { TimelineDaySectionHeader } from "@/lib/ui/timeline/TimelineDaySectionHeader";
import { TimelineRailRow } from "@/lib/ui/timeline/TimelineRailRow";
import { formatTimelineTimeLabel } from "@/lib/ui/timeline/TimelineRail";
import { timelinePresentationIcon } from "@/lib/ui/timeline/timelinePresentationIcon";
import { UI_TEXT_MUTED, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { getTodayDayKey } from "@/lib/time/dayKey";

export type TimelineFeedListProps = {
  sections: TimelineFeedSection[];
  onPressItem: (item: TimelinePresentationItem) => void;
  /** Top-boundary older-history load (not bottom). */
  onStartReached: () => void;
  loadingMore: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  contentBottomPadding: number;
  /**
   * Intentional scroll target. New `id` arms one bounded scroll attempt
   * (cold open, Return to Today, or calendar jump).
   */
  scrollTarget: FeedScrollTarget;
  /** Fired once the target is applied or abandoned after bounded retries / user drag. */
  onScrollTargetSettled?: (id: number) => void;
  paginationError?: string | null;
  onRetryPage?: () => void;
};

export function TimelineFeedList({
  sections,
  onPressItem,
  onStartReached,
  loadingMore,
  refreshing,
  onRefresh,
  contentBottomPadding,
  scrollTarget,
  onScrollTargetSettled,
  paginationError,
  onRetryPage,
}: TimelineFeedListProps) {
  const today = useMemo(() => getTodayDayKey(), []);
  const listRef = useRef<SectionList<TimelinePresentationItem, TimelineFeedSection>>(null);
  const startReachedArmedRef = useRef(false);
  const lastStartReachedAtRef = useRef(0);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTargetIdRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const userDragCancelRef = useRef(false);
  const layoutReadyRef = useRef(false);
  const settledIdsRef = useRef(new Set<number>());

  const clearArmTimer = useCallback(() => {
    if (armTimerRef.current) {
      clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
  }, []);

  const armStartReached = useCallback(() => {
    clearArmTimer();
    armTimerRef.current = setTimeout(() => {
      startReachedArmedRef.current = true;
      armTimerRef.current = null;
    }, 400);
  }, [clearArmTimer]);

  useEffect(() => () => clearArmTimer(), [clearArmTimer]);

  const markSettled = useCallback(
    (id: number) => {
      if (settledIdsRef.current.has(id)) return;
      settledIdsRef.current.add(id);
      pendingTargetIdRef.current = null;
      retryCountRef.current = 0;
      userDragCancelRef.current = false;
      armStartReached();
      onScrollTargetSettled?.(id);
    },
    [armStartReached, onScrollTargetSettled],
  );

  const attemptScroll = useCallback(() => {
    const id = pendingTargetIdRef.current;
    if (id == null) return;
    if (userDragCancelRef.current) {
      markSettled(id);
      return;
    }
    if (!layoutReadyRef.current) return;
    if (sections.length === 0) return;

    const location = resolveScrollLocation(sections, scrollTarget);
    if (!location) {
      // Day not loaded yet — keep pending; ensureDayLoaded will grow sections.
      return;
    }
    if (retryCountRef.current >= MAX_FEED_SCROLL_RETRIES) {
      markSettled(id);
      return;
    }
    retryCountRef.current += 1;
    try {
      listRef.current?.scrollToLocation({
        sectionIndex: location.sectionIndex,
        itemIndex: location.itemIndex,
        animated: false,
        viewPosition: location.viewPosition,
      });
    } catch {
      // Layout not ready; onScrollToIndexFailed / contentSizeChange retries.
    }
  }, [markSettled, scrollTarget, sections]);

  // Arm a new intentional target.
  useEffect(() => {
    if (settledIdsRef.current.has(scrollTarget.id)) return;
    pendingTargetIdRef.current = scrollTarget.id;
    retryCountRef.current = 0;
    userDragCancelRef.current = false;
    startReachedArmedRef.current = false;
    clearArmTimer();
    // Attempt after paint when content already measured.
    const id = requestAnimationFrame(() => {
      attemptScroll();
    });
    return () => cancelAnimationFrame(id);
  }, [scrollTarget.id, scrollTarget.mode, scrollTarget.day, attemptScroll, clearArmTimer]);

  // Retry when content size changes (sections grew or first layout).
  const onContentSizeChange = useCallback(() => {
    layoutReadyRef.current = true;
    attemptScroll();
  }, [attemptScroll]);

  const onScrollToIndexFailed = useCallback(() => {
    const id = pendingTargetIdRef.current;
    if (id == null) return;
    if (retryCountRef.current >= MAX_FEED_SCROLL_RETRIES) {
      markSettled(id);
      return;
    }
    // Short deferred retry without device-speed timeouts.
    requestAnimationFrame(() => {
      attemptScroll();
    });
  }, [attemptScroll, markSettled]);

  // Treat a successful scroll frame as settled once we have retried at least once
  // or content was ready and we issued a scroll. Use content-size + one rAF settle.
  useEffect(() => {
    const id = pendingTargetIdRef.current;
    if (id == null) return;
    if (userDragCancelRef.current) {
      markSettled(id);
      return;
    }
    const location = resolveScrollLocation(sections, scrollTarget);
    if (!location) return;
    if (!layoutReadyRef.current) return;
    // After a successful scrollToLocation call path, settle on next frame when
    // retries have started (or first attempt with layout ready).
    if (retryCountRef.current >= 1) {
      const raf = requestAnimationFrame(() => {
        if (pendingTargetIdRef.current === id && !userDragCancelRef.current) {
          markSettled(id);
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [sections, scrollTarget, markSettled]);

  const handleStartReached = useCallback(() => {
    if (!startReachedArmedRef.current) return;
    if (loadingMore) return;
    const now = Date.now();
    if (now - lastStartReachedAtRef.current < 600) return;
    lastStartReachedAtRef.current = now;
    onStartReached();
  }, [loadingMore, onStartReached]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (e.nativeEvent.contentOffset.y < 80) {
      startReachedArmedRef.current = true;
    }
  }, []);

  const onScrollBeginDrag = useCallback(() => {
    if (pendingTargetIdRef.current != null) {
      userDragCancelRef.current = true;
      markSettled(pendingTargetIdRef.current);
    }
  }, [markSettled]);

  const renderItem = useCallback(
    ({
      item,
      index,
      section,
    }: SectionListRenderItemInfo<TimelinePresentationItem, TimelineFeedSection>) => {
      const isContext = item.displayRole === "day_context";
      const timeLabel = isContext ? "" : formatTimelineTimeLabel(item.occurredAt);
      const subtitle =
        item.summary ??
        (item.status !== "ready" ? item.status : undefined);
      return (
        <TimelineRailRow
          timeLabel={timeLabel}
          title={item.title}
          {...(subtitle ? { subtitle } : {})}
          icon={timelinePresentationIcon(item.kind)}
          accessibilityLabel={item.accessibilityLabel}
          actionable
          isFirstInSegment={index === 0}
          isLastInSegment={index === section.data.length - 1}
          onPress={() => onPressItem(item)}
          testID={`timeline-feed-row-${item.dedupeKey}`}
        />
      );
    },
    [onPressItem],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: TimelineFeedSection }) => (
      <TimelineDaySectionHeader
        dayKey={section.day}
        todayDayKey={today}
        testID={`timeline-feed-section-header-${section.day}`}
      />
    ),
    [today],
  );

  const keyExtractor = useCallback(
    (item: TimelinePresentationItem) => item.dedupeKey || item.id,
    [],
  );

  const ListHeader = useMemo(() => {
    if (paginationError) {
      return (
        <Pressable onPress={onRetryPage} style={styles.edge} accessibilityRole="button">
          <Text style={styles.edgeError}>{paginationError}</Text>
          <Text style={styles.edgeRetry}>Tap to retry</Text>
        </Pressable>
      );
    }
    if (loadingMore) {
      return (
        <View style={styles.edge}>
          <ActivityIndicator color={UI_TEXT_MUTED} />
        </View>
      );
    }
    return <View style={{ height: 4 }} />;
  }, [loadingMore, onRetryPage, paginationError]);

  return (
    <SectionList
      ref={listRef}
      sections={sections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      stickySectionHeadersEnabled={false}
      onStartReached={handleStartReached}
      onStartReachedThreshold={0.2}
      onScroll={onScroll}
      onScrollBeginDrag={onScrollBeginDrag}
      scrollEventThrottle={16}
      onContentSizeChange={onContentSizeChange}
      onScrollToIndexFailed={onScrollToIndexFailed}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 24,
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8E8E93" />
      }
      contentContainerStyle={{ paddingBottom: contentBottomPadding }}
      ListHeaderComponent={ListHeader}
      ListFooterComponent={<View style={{ height: 8 }} />}
      initialNumToRender={16}
      maxToRenderPerBatch={12}
      windowSize={7}
      removeClippedSubviews
    />
  );
}

const styles = StyleSheet.create({
  edge: { paddingVertical: 16, alignItems: "center" },
  edgeError: { color: UI_TEXT_SECONDARY, fontSize: 14 },
  edgeRetry: { marginTop: 4, color: SYSTEM_ACCENT, fontSize: 14, fontWeight: "600" },
});
