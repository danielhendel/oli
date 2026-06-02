/**
 * Workout Physiology v1 — shared HR zone row.
 *
 * Used by both the Strength and Cardio HR detail modals to render a single zone row:
 *
 *   [ Zone N ] [▰▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱] [m:ss] [HR range bpm]
 *
 * - Progress fill uses the app's primary blue ({@link SYSTEM_ACCENT}) — the same accent
 *   the Activity / Strength / Cardio cards use. No Apple-multicolor zones.
 * - Bar width is proportional to `minutes / maxZoneMinutes` (passed in by the modal
 *   so all rows share the same denominator — usually the row with the most minutes).
 *   When the total is zero we still render an empty track so the layout is stable.
 * - Zero-minute rows show `"0:00"` (Apple Fitness parity); missing data shows
 *   `MISSING_VALUE` ("—"). Range text always renders since it's derived from the
 *   resolved threshold tuple, never from the data itself.
 *
 * Accessibility: the row aggregates `zoneLabel`, `durationLabel`, and `rangeLabel`
 * into a single accessibilityLabel so VoiceOver reads them in spatial order.
 */

import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_PROGRESS_TRACK_EMPTY,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

/** Glyph used for missing duration. Mirrors STRENGTH/CARDIO_TODAY_DETAIL_MISSING_VALUE. */
export const HR_ZONE_ROW_MISSING_VALUE = "\u2014" as const;

export type HrZoneRowProps = {
  /** "Zone 1" through "Zone 5" — passed in by the parent so labeling stays centralized. */
  zoneLabel: string;
  /**
   * Pre-formatted duration text ("32:49" / "0:00" / `null`). When `null` the row renders
   * {@link HR_ZONE_ROW_MISSING_VALUE} and the bar fill is suppressed (empty track only).
   */
  durationLabel: string | null;
  /** Pre-formatted range string ("<110 bpm" / "110–129 bpm" / "170+ bpm"). */
  rangeLabel: string;
  /**
   * Numeric zone minutes for THIS row. When null/NaN or `maxZoneMinutes` is 0 the bar
   * stays empty. Otherwise fill width = `clamp(minutes / maxZoneMinutes, 0, 1)`.
   */
  minutes: number | null;
  /**
   * Denominator for the proportional fill — typically `Math.max(...zoneTuple)` so the
   * dominant zone reaches the right edge and the others scale relatively.
   */
  maxZoneMinutes: number;
  /** Stable testID prefix (e.g. `"strength-today-hr-detail-zone"`). */
  testIDPrefix: string;
  /** Zone index 1..5 used for testID suffix + accessibility ordering. */
  zoneNumber: 1 | 2 | 3 | 4 | 5;
};

function computeFillPercent(minutes: number | null, maxZoneMinutes: number): number {
  if (
    typeof minutes !== "number" ||
    !Number.isFinite(minutes) ||
    minutes <= 0 ||
    !Number.isFinite(maxZoneMinutes) ||
    maxZoneMinutes <= 0
  ) {
    return 0;
  }
  const ratio = minutes / maxZoneMinutes;
  if (ratio <= 0) return 0;
  if (ratio >= 1) return 100;
  return ratio * 100;
}

export function HrZoneRow({
  zoneLabel,
  durationLabel,
  rangeLabel,
  minutes,
  maxZoneMinutes,
  testIDPrefix,
  zoneNumber,
}: HrZoneRowProps): React.ReactElement {
  const fillPercent = useMemo(
    () => computeFillPercent(minutes, maxZoneMinutes),
    [minutes, maxZoneMinutes],
  );

  const durationDisplay = durationLabel ?? HR_ZONE_ROW_MISSING_VALUE;
  const accessibilityLabel =
    durationLabel != null
      ? `${zoneLabel}, ${durationLabel}, ${rangeLabel}`
      : `${zoneLabel}, not available, ${rangeLabel}`;

  return (
    <View
      style={styles.row}
      testID={`${testIDPrefix}-${zoneNumber}`}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      <Text
        style={styles.zoneLabel}
        accessibilityElementsHidden
        importantForAccessibility="no"
        numberOfLines={1}
      >
        {zoneLabel}
      </Text>

      <View
        style={styles.barTrack}
        testID={`${testIDPrefix}-${zoneNumber}-track`}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {fillPercent > 0 ? (
          <View
            style={[styles.barFill, { width: `${fillPercent}%` }]}
            testID={`${testIDPrefix}-${zoneNumber}-fill`}
          />
        ) : null}
      </View>

      <Text
        style={styles.durationLabel}
        testID={`${testIDPrefix}-${zoneNumber}-duration`}
        accessibilityElementsHidden
        importantForAccessibility="no"
        numberOfLines={1}
      >
        {durationDisplay}
      </Text>

      <Text
        style={styles.rangeLabel}
        testID={`${testIDPrefix}-${zoneNumber}-range`}
        accessibilityElementsHidden
        importantForAccessibility="no"
        numberOfLines={1}
      >
        {rangeLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    minHeight: 40,
  },
  zoneLabel: {
    width: 60,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.08,
  },
  barTrack: {
    flex: 1,
    height: 8,
    minWidth: 24,
    borderRadius: 4,
    backgroundColor: UI_PROGRESS_TRACK_EMPTY,
    overflow: "hidden",
    justifyContent: "center",
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: SYSTEM_ACCENT,
  },
  durationLabel: {
    width: 56,
    textAlign: "right",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.06,
    fontVariant: ["tabular-nums"],
  },
  rangeLabel: {
    width: 100,
    textAlign: "right",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    color: UI_TEXT_MUTED,
    letterSpacing: -0.04,
  },
});
