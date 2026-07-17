// lib/ui/timeline/TimelineRail.tsx
// Vertical timeline rail: time label + connector dot + event card per item.
// Virtualized via FlatList; this component owns the day's scroll + pull-to-refresh.
import type { ReactElement } from "react";
import { FlatList, View, type RefreshControlProps } from "react-native";
import type { TimelineDayItem } from "@/lib/features/timeline/types";
import { TimelineRailRow } from "@/lib/ui/timeline/TimelineRailRow";

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
        <TimelineRailRow
          timeLabel={formatTimelineTimeLabel(item.timestamp)}
          title={item.title}
          {...(item.subtitle ? { subtitle: item.subtitle } : {})}
          icon={item.icon}
          accessibilityLabel={item.accessibilityLabel}
          actionable
          isFirstInSegment={index === 0}
          isLastInSegment={index === items.length - 1}
          onPress={() => onPressItem(item)}
        />
      )}
      ListFooterComponent={<View style={{ height: contentBottomPadding }} />}
      initialNumToRender={16}
      maxToRenderPerBatch={12}
      windowSize={7}
      removeClippedSubviews
      scrollEventThrottle={16}
    />
  );
}
