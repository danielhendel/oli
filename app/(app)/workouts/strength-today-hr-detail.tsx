/**
 * Strength Today — Avg Heart Rate detail modal.
 *
 * Screen-as-modal (registered with `presentation: "modal"` in `app/(app)/_layout.tsx`),
 * mirroring `today-muscle-group.tsx` / `energy-metric-explainer.tsx`. This component:
 *
 * - Reads `DailyEnergyCardDto.energyInfluencers.strength.averageHeartRateBpm` via the same
 *   `useDailyEnergyCard(day)` hook that powers Daily Energy. **No parallel HR parsing path.**
 * - Renders Avg HR (rounded, "{n} BPM") or `STRENGTH_TODAY_DETAIL_MISSING_VALUE` when missing.
 * - Lists Zones 1–5 with a graceful unavailable explanation — zone-minute payloads are not
 *   produced by today's HealthKit ingestion. The list does **not** invent zone values.
 *
 * Closes (calls `router.back()`) when the `day` route param is missing/malformed so the modal
 * cannot land in an invalid state.
 */
import React, { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import { useDailyEnergyCard } from "@/lib/data/dash/useDailyEnergyCard";
import { formatStrengthTodayAvgHeartRateValue } from "@/lib/data/workouts/strengthTodayDetailVm";
import { STRENGTH_TODAY_DETAIL_MISSING_VALUE } from "@/lib/data/workouts/strengthTodayDetailVm";
import { WORKOUTS_SCREEN_CONTENT_BG } from "@/lib/ui/headers/workoutsStackHeader";
import {
  dashMetricRowLabelTextStyle,
  dashMetricRowValueTextStyle,
} from "@/lib/ui/dash/dashMetricRowTextStyle";
import {
  UI_BORDER_HAIRLINE,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

/** Route pathname — exported so screens / tests don't duplicate the literal. */
export const STRENGTH_TODAY_HR_DETAIL_PATHNAME =
  "/(app)/workouts/strength-today-hr-detail" as const;

/** Route params accepted by the modal. */
export type StrengthTodayHrDetailRouteParams = {
  /** YYYY-MM-DD; the day whose strength avg HR / zones should be shown. */
  day: string;
};

/** Build typed route params for `router.push(...)`. */
export function buildStrengthTodayHrDetailRouteParams(input: {
  day: string;
}): StrengthTodayHrDetailRouteParams {
  return { day: input.day };
}

/** Modal navigation title — exported so layout / tests can compare. */
export const STRENGTH_TODAY_HR_DETAIL_TITLE = "Avg Heart Rate" as const;

/** Graceful copy when HR zone minutes are not yet captured in our pipeline. */
export const STRENGTH_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE =
  "Heart rate zones aren\u2019t available yet." as const;

/** "Average across today's strength sessions, weighted by duration." */
export const STRENGTH_TODAY_HR_DETAIL_VALUE_HINT =
  "Average across today\u2019s strength sessions, weighted by duration." as const;

function parseDayParam(value: string | string[] | undefined): string | null {
  const v = typeof value === "string" ? value : Array.isArray(value) ? value[0] : null;
  if (v == null) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export default function StrengthTodayHrDetailScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{ day?: string | string[] }>();
  const day = parseDayParam(params.day);

  useEffect(() => {
    if (day == null) router.back();
  }, [day, router]);

  if (day == null) {
    return <View testID="strength-today-hr-detail-empty" />;
  }

  return <StrengthTodayHrDetailInner day={day} />;
}

function StrengthTodayHrDetailInner({ day }: { day: string }): React.ReactElement {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({ title: STRENGTH_TODAY_HR_DETAIL_TITLE });
  }, [navigation]);

  const { energy } = useDailyEnergyCard(day);
  const avgHrBpm = energy?.energyInfluencers?.strength?.averageHeartRateBpm;
  const avgHrText = useMemo(() => {
    const formatted = formatStrengthTodayAvgHeartRateValue(avgHrBpm);
    if (formatted === STRENGTH_TODAY_DETAIL_MISSING_VALUE) return formatted;
    // The detail modal renders BPM in uppercase for the dominant figure — the row formatter
    // returns lowercase "bpm" for the Today card row. Re-cased here on purpose.
    return formatted.replace(/\bbpm\b/, "BPM");
  }, [avgHrBpm]);

  const zoneRows = [1, 2, 3, 4, 5].map((zone) => ({
    zone,
    label: `Zone ${zone}`,
    value: STRENGTH_TODAY_DETAIL_MISSING_VALUE,
  }));

  const rootA11y =
    avgHrText === STRENGTH_TODAY_DETAIL_MISSING_VALUE
      ? `${STRENGTH_TODAY_HR_DETAIL_TITLE}. Not available. ${STRENGTH_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE}`
      : `${STRENGTH_TODAY_HR_DETAIL_TITLE}. ${avgHrText}. ${STRENGTH_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE}`;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      testID="strength-today-hr-detail-scroll"
      accessibilityRole="summary"
      accessibilityLabel={rootA11y}
    >
      <View style={styles.headerBlock}>
        <Text style={styles.heroLabel} accessibilityRole="header">
          {STRENGTH_TODAY_HR_DETAIL_TITLE}
        </Text>
        <Text
          style={styles.heroValue}
          testID="strength-today-hr-detail-value"
          accessibilityLabel={
            avgHrText === STRENGTH_TODAY_DETAIL_MISSING_VALUE
              ? "Average heart rate not available"
              : `Average heart rate ${avgHrText}`
          }
        >
          {avgHrText}
        </Text>
        <Text
          style={styles.heroHint}
          testID="strength-today-hr-detail-value-hint"
        >
          {STRENGTH_TODAY_HR_DETAIL_VALUE_HINT}
        </Text>
      </View>

      <View style={styles.zonesBlock} testID="strength-today-hr-detail-zones" accessibilityRole="list">
        <Text style={styles.zonesHeading} accessibilityRole="header">
          Zones
        </Text>
        {zoneRows.map((row) => (
          <View
            key={row.zone}
            style={styles.zoneRow}
            testID={`strength-today-hr-detail-zone-${row.zone}`}
            accessible
            accessibilityLabel={`${row.label}, not available`}
          >
            <Text style={dashMetricRowLabelTextStyle}>{row.label}</Text>
            <Text style={dashMetricRowValueTextStyle}>{row.value}</Text>
          </View>
        ))}
        <Text
          style={styles.zonesUnavailableMessage}
          testID="strength-today-hr-detail-zones-unavailable"
        >
          {STRENGTH_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 20,
  },
  headerBlock: {
    gap: 6,
  },
  heroLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
    letterSpacing: -0.08,
  },
  heroValue: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
    fontVariant: ["tabular-nums"],
  },
  heroHint: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "400",
    color: UI_TEXT_TERTIARY_LABEL,
    letterSpacing: -0.06,
  },
  zonesBlock: {
    gap: 4,
  },
  zonesHeading: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI_BORDER_HAIRLINE,
  },
  zonesUnavailableMessage: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: UI_TEXT_TERTIARY_LABEL,
    marginTop: 10,
  },
});
