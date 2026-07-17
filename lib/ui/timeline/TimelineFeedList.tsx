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
import { finalSectionIndex } from "@/lib/features/timeline/timelineFeedOrder";
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
  /** Bumps on hard reset so initial scroll-to-newest re-runs. */
  listGeneration: number;
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
  listGeneration,
  paginationError,
  onRetryPage,
}: TimelineFeedListProps) {
  const today = useMemo(() => getTodayDayKey(), []);
  const listRef = useRef<SectionList<TimelinePresentationItem, TimelineFeedSection>>(null);
  const didInitialScrollRef = useRef(false);
  const startReachedArmedRef = useRef(false);
  const lastStartReachedAtRef = useRef(0);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    didInitialScrollRef.current = false;
    startReachedArmedRef.current = false;
    clearArmTimer();
  }, [listGeneration, clearArmTimer]);

  useEffect(() => () => clearArmTimer(), [clearArmTimer]);

  const scrollToNewest = useCallback(
    (animated: boolean) => {
      if (sections.length === 0) return;
      const sectionIndex = finalSectionIndex(sections);
      const last = sections[sectionIndex];
      const itemIndex = Math.max(0, (last?.data.length ?? 1) - 1);
      try {
        listRef.current?.scrollToLocation({
          sectionIndex,
          itemIndex,
          animated,
          viewPosition: 1,
        });
      } catch {
        // SectionList may throw if layout is not ready; contentSizeChange retries once.
      }
    },
    [sections],
  );

  useEffect(() => {
    if (didInitialScrollRef.current) return;
    if (sections.length === 0) return;
    const id = requestAnimationFrame(() => {
      scrollToNewest(false);
      didInitialScrollRef.current = true;
      armStartReached();
    });
    return () => cancelAnimationFrame(id);
  }, [sections, scrollToNewest, listGeneration, armStartReached]);

  const onContentSizeChange = useCallback(() => {
    if (didInitialScrollRef.current) return;
    if (sections.length === 0) return;
    scrollToNewest(false);
    didInitialScrollRef.current = true;
    armStartReached();
  }, [scrollToNewest, sections.length, armStartReached]);

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
        sticky
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
      stickySectionHeadersEnabled
      onStartReached={handleStartReached}
      onStartReachedThreshold={0.2}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onContentSizeChange={onContentSizeChange}
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
