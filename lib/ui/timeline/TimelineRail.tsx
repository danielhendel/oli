// lib/ui/timeline/TimelineRail.tsx
// Vertical timeline rail: time label + connector dot + event card per item.
// Virtualized via FlatList; this component owns the day's scroll + pull-to-refresh.
import type { ReactElement } from "react";
import { FlatList, StyleSheet, Text, View, type RefreshControlProps } from "react-native";
import type { TimelineDayItem } from "@/lib/features/timeline/types";
import { TimelineEventCard } from "@/lib/ui/timeline/TimelineEventCard";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { UI_BORDER_HAIRLINE, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";

export function formatTimelineTimeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export type TimelineRailProps = {
  items: readonly TimelineDayItem[];
  onPressItem: (item: TimelineDayItem) => void;
  refreshControl?: ReactElement<RefreshControlProps>;
  contentBottomPadding?: number;
  ListHeaderComponent?: ReactElement | null;
};

export function TimelineRail({
  items,
  onPressItem,
  refreshControl,
  contentBottomPadding = 40,
  ListHeaderComponent,
}: TimelineRailProps) {
  return (
    <FlatList
      data={items as TimelineDayItem[]}
      keyExtractor={(item) => item.id}
      {...(refreshControl ? { refreshControl } : {})}
      {...(ListHeaderComponent ? { ListHeaderComponent } : {})}
      renderItem={({ item, index }) => (
        <View style={styles.row}>
          <View style={styles.timeColumn}>
            <Text style={styles.timeText}>{formatTimelineTimeLabel(item.timestamp)}</Text>
          </View>
          <View style={styles.railColumn}>
            <View
              style={[
                styles.railLine,
                index === 0 && styles.railLineTopHidden,
                index === items.length - 1 && styles.railLineBottomHidden,
              ]}
            />
            <View style={styles.railDot} />
          </View>
          <View style={styles.cardColumn}>
            <TimelineEventCard
              item={item}
              timeLabel={formatTimelineTimeLabel(item.timestamp)}
              onPress={onPressItem}
            />
          </View>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListFooterComponent={<View style={{ height: contentBottomPadding }} />}
      initialNumToRender={16}
      maxToRenderPerBatch={12}
      windowSize={7}
      removeClippedSubviews
      scrollEventThrottle={16}
    />
  );
}

const TIME_COL_WIDTH = 64;
const RAIL_COL_WIDTH = 20;
const DOT_SIZE = 10;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "stretch" },
  timeColumn: {
    width: TIME_COL_WIDTH,
    paddingTop: 16,
    alignItems: "flex-end",
    paddingRight: 8,
  },
  timeText: { fontSize: 12, fontWeight: "600", color: UI_TEXT_TERTIARY_LABEL },
  railColumn: {
    width: RAIL_COL_WIDTH,
    alignItems: "center",
  },
  railLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: UI_BORDER_HAIRLINE,
  },
  railLineTopHidden: { top: 22 },
  railLineBottomHidden: { bottom: "50%" },
  railDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: SYSTEM_ACCENT,
    marginTop: 18,
  },
  cardColumn: { flex: 1, paddingVertical: 4 },
  separator: { height: 8 },
});
