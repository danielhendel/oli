// lib/ui/timeline/TimelineDaySectionHeader.tsx
// Centered one-line day-date section header shared by single-day Timeline and feed.
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { formatTimelineDaySectionHeading } from "@/lib/ui/timeline/formatTimelineDaySectionHeading";
import { useOliColors } from "@/lib/ui/theme/OliColorContext";

export type TimelineDaySectionHeaderProps = {
  dayKey: string;
  todayDayKey: string;
  /** Opaque sticky backdrop for continuous feed section headers. */
  sticky?: boolean;
  testID?: string;
};

export function TimelineDaySectionHeader({
  dayKey,
  todayDayKey,
  sticky = false,
  testID = "timeline-day-section-header",
}: TimelineDaySectionHeaderProps) {
  const colors = useOliColors();
  const heading = useMemo(
    () => formatTimelineDaySectionHeading({ dayKey, todayDayKey }),
    [dayKey, todayDayKey],
  );

  return (
    <View
      style={[
        styles.wrap,
        sticky ? styles.sticky : null,
        { backgroundColor: colors.appScreenBg },
      ]}
      accessibilityRole="header"
      accessibilityLabel={heading.accessibilityLabel}
      testID={testID}
    >
      <Text
        style={[styles.label, { color: colors.textPrimary }]}
        accessible={false}
        allowFontScaling
      >
        {heading.visibleLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  sticky: {
    zIndex: 1,
  },
  /** One compact style for the entire visible line (Today and historical). */
  label: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
    textAlign: "center",
  },
});
