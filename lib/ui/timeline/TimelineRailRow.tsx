// lib/ui/timeline/TimelineRailRow.tsx
// Shared time + rail + card row used by single-day TimelineRail and continuous feed.
import { StyleSheet, Text, View } from "react-native";
import { TimelineEventCard } from "@/lib/ui/timeline/TimelineEventCard";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { UI_BORDER_HAIRLINE, UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";

export type TimelineRailRowProps = {
  timeLabel: string;
  title: string;
  subtitle?: string;
  icon: string;
  accessibilityLabel: string;
  actionable?: boolean;
  isFirstInSegment: boolean;
  isLastInSegment: boolean;
  onPress: () => void;
  testID?: string;
};

export function TimelineRailRow({
  timeLabel,
  title,
  subtitle,
  icon,
  accessibilityLabel,
  actionable = true,
  isFirstInSegment,
  isLastInSegment,
  onPress,
  testID,
}: TimelineRailRowProps) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.timeColumn} importantForAccessibility="no">
        <Text style={styles.timeText}>{timeLabel}</Text>
      </View>
      <View
        style={styles.railColumn}
        importantForAccessibility="no"
        accessibilityElementsHidden
      >
        <View
          style={[
            styles.railLine,
            isFirstInSegment && styles.railLineTopHidden,
            isLastInSegment && styles.railLineBottomHidden,
          ]}
        />
        <View style={styles.railDot} />
      </View>
      <View style={styles.cardColumn}>
        <TimelineEventCard
          item={{
            title,
            icon,
            accessibilityLabel,
            ...(subtitle ? { subtitle } : {}),
          }}
          timeLabel={timeLabel}
          onPress={onPress}
          actionable={actionable}
        />
      </View>
    </View>
  );
}

const TIME_COL_WIDTH = 64;
const RAIL_COL_WIDTH = 20;
const DOT_SIZE = 10;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "stretch", marginBottom: 4 },
  timeColumn: {
    width: TIME_COL_WIDTH,
    paddingTop: 12,
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
  railLineTopHidden: { top: 18 },
  railLineBottomHidden: { bottom: "50%" },
  railDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: SYSTEM_ACCENT,
    marginTop: 14,
  },
  cardColumn: { flex: 1, paddingVertical: 4 },
});
