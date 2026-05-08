import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SleepRecoverySummaryModel } from "@/lib/dashboard/todayHealthHero";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import {
  UI_BORDER_HAIRLINE,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

type Props = {
  model: SleepRecoverySummaryModel;
};

export function SleepRecoverySummary({ model }: Props): React.ReactElement {
  const { sleepDisplay, recoveryDisplay, footerLabel, loading, accessibilityLabel } = model;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={accessibilityLabel}
      testID="sleep-recovery-summary"
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.columnLabel} maxFontSizeMultiplier={1.4}>
              Sleep
            </Text>
            {loading ? (
              <View style={styles.valueSkeleton} />
            ) : (
              <Text style={styles.value} maxFontSizeMultiplier={1.35}>
                {sleepDisplay}
              </Text>
            )}
            <Text style={styles.footer} maxFontSizeMultiplier={1.35}>
              {footerLabel}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.column}>
            <Text style={styles.columnLabel} maxFontSizeMultiplier={1.4}>
              Recovery
            </Text>
            {loading ? (
              <View style={styles.valueSkeleton} />
            ) : (
              <Text style={styles.value} maxFontSizeMultiplier={1.35}>
                {recoveryDisplay}
              </Text>
            )}
            <Text style={styles.footer} maxFontSizeMultiplier={1.35}>
              {footerLabel}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...elevatedCardSurfaceStyle,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 0,
  },
  column: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  columnLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.15,
    color: UI_TEXT_SECONDARY,
  },
  value: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.2,
    color: UI_TEXT_PRIMARY,
    marginTop: 2,
  },
  valueSkeleton: {
    marginTop: 4,
    height: 22,
    borderRadius: 6,
    width: "72%",
    maxWidth: 96,
    backgroundColor: "rgba(140, 150, 170, 0.18)",
  },
  footer: {
    fontSize: 12,
    lineHeight: 16,
    color: UI_TEXT_MUTED,
    marginTop: 4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    marginHorizontal: 12,
    backgroundColor: UI_BORDER_HAIRLINE,
    opacity: 0.9,
  },
});
