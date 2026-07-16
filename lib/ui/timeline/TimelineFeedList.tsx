// lib/ui/timeline/TimelineFeedList.tsx
// Continuous SectionList feed with sticky day headers.
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
  type SectionListRenderItemInfo,
} from "react-native";
import type { TimelinePresentationItem } from "@oli/contracts";
import type { TimelineFeedSection } from "@/lib/features/timeline/useTimelineFeed";
import { TimelineDaySectionHeader } from "@/lib/ui/timeline/TimelineDaySectionHeader";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { getTodayDayKey } from "@/lib/time/dayKey";

export type TimelineFeedListProps = {
  sections: TimelineFeedSection[];
  onPressItem: (item: TimelinePresentationItem) => void;
  onEndReached: () => void;
  loadingMore: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  contentBottomPadding: number;
  paginationError?: string | null;
  onRetryPage?: () => void;
};

function formatTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TimelineFeedList({
  sections,
  onPressItem,
  onEndReached,
  loadingMore,
  refreshing,
  onRefresh,
  contentBottomPadding,
  paginationError,
  onRetryPage,
}: TimelineFeedListProps) {
  const today = useMemo(() => getTodayDayKey(), []);

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<TimelinePresentationItem, TimelineFeedSection>) => {
      const time =
        item.displayRole === "day_context" ? "" : formatTime(item.occurredAt);
      return (
        <Pressable
          onPress={() => onPressItem(item)}
          accessibilityRole="button"
          accessibilityLabel={item.accessibilityLabel}
          style={styles.row}
        >
          <View style={styles.rowMain}>
            <Text style={styles.title}>{item.title}</Text>
            {item.summary ? <Text style={styles.summary}>{item.summary}</Text> : null}
            {item.status !== "ready" ? (
              <Text style={styles.status}>{item.status}</Text>
            ) : null}
          </View>
          {time ? <Text style={styles.time}>{time}</Text> : null}
        </Pressable>
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

  const ListFooter = useMemo(() => {
    if (paginationError) {
      return (
        <Pressable onPress={onRetryPage} style={styles.footer} accessibilityRole="button">
          <Text style={styles.footerError}>{paginationError}</Text>
          <Text style={styles.footerRetry}>Tap to retry</Text>
        </Pressable>
      );
    }
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator color={UI_TEXT_MUTED} />
        </View>
      );
    }
    return <View style={{ height: 8 }} />;
  }, [loadingMore, onRetryPage, paginationError]);

  return (
    <SectionList
      sections={sections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      stickySectionHeadersEnabled
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8E8E93" />
      }
      contentContainerStyle={{ paddingBottom: contentBottomPadding }}
      ListFooterComponent={ListFooter}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
    minHeight: 44,
  },
  rowMain: { flex: 1, paddingRight: 12 },
  title: { fontSize: 16, fontWeight: "600", color: UI_TEXT_PRIMARY },
  summary: { marginTop: 2, fontSize: 14, color: UI_TEXT_SECONDARY },
  status: { marginTop: 2, fontSize: 12, color: UI_TEXT_MUTED, textTransform: "capitalize" },
  time: { fontSize: 13, color: UI_TEXT_MUTED, paddingTop: 2 },
  footer: { paddingVertical: 16, alignItems: "center" },
  footerError: { color: UI_TEXT_SECONDARY, fontSize: 14 },
  footerRetry: { marginTop: 4, color: SYSTEM_ACCENT, fontSize: 14, fontWeight: "600" },
});
