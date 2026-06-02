/**
 * Cardio Today — Avg Heart Rate detail modal.
 *
 * Mirror of {@link ./strength-today-hr-detail.tsx} for cardio sessions. Screen-as-modal
 * (registered with `presentation: "modal"` in `app/(app)/_layout.tsx`). This component:
 *
 * - Primary truth: `DailyEnergyCardDto.energyInfluencers.cardio.{averageHeartRateBpm,
 *   heartRateZoneMinutes, heartRateZoneBasis}` via `useDailyEnergyCard(day)`.
 * - **Session-level fallback**: when the daily aggregate is missing zone minutes (typically
 *   when `DailyFacts.cardio.heartRateZoneMinutes` hasn't been recomputed since the
 *   Phase B/C deploy), the modal falls back to the cardio hero session's
 *   `heartRateZoneMinutes` passed verbatim through route params from `overview.tsx`.
 *   Basis falls back to `DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM` (Phase B's only model).
 *   No raw mutation. No invented zones.
 * - Renders Avg HR (rounded, "{n} BPM") or `CARDIO_TODAY_DETAIL_MISSING_VALUE` when missing.
 * - Renders the shared {@link HrZoneRow} for Zones 1–5 with a proportional blue progress bar,
 *   `m:ss` Apple-Fitness duration, and the derived HR range. When zones are unavailable from
 *   BOTH the daily aggregate and the session fallback the list renders the graceful
 *   "zones aren't available yet" copy AFTER the avg HR figure — never inventing values.
 *
 * Closes (calls `router.back()`) when the `day` route param is missing/malformed.
 */
import React, { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import { useDailyEnergyCard } from "@/lib/data/dash/useDailyEnergyCard";
import {
  CARDIO_TODAY_DETAIL_MISSING_VALUE,
  formatCardioTodayAvgHeartRateValue,
} from "@/lib/data/workouts/cardioTodayDetailVm";
import {
  HEART_RATE_ZONE_LABELS,
  decodeHeartRateZoneMinutesFromRoute,
  encodeHeartRateZoneMinutesForRoute,
  formatZoneDurationMinSec,
  formatZoneRangeBpm,
  resolveZoneDisplayThresholdsBpm,
  validateHeartRateZoneMinutesTuple,
  type HeartRateZoneMinutesTuple,
} from "@/lib/data/workouts/heartRateZonePresentation";
import { HrZoneRow } from "@/lib/ui/workouts/HrZoneRow";
import { WORKOUTS_SCREEN_CONTENT_BG } from "@/lib/ui/headers/workoutsStackHeader";
import {
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
  UI_TEXT_TERTIARY_LABEL,
} from "@/lib/ui/theme/uiTokens";

/** Route pathname — exported so screens / tests don't duplicate the literal. */
export const CARDIO_TODAY_HR_DETAIL_PATHNAME =
  "/(app)/workouts/cardio-today-hr-detail" as const;

/** Route params accepted by the modal. */
export type CardioTodayHrDetailRouteParams = {
  /** YYYY-MM-DD; the day whose cardio avg HR / zones should be shown. */
  day: string;
  /**
   * Session-level zone fallback — comma-separated 5-tuple of fractional minutes for the
   * cardio hero session, used ONLY when `DailyFacts.cardio.heartRateZoneMinutes` is
   * missing. Omitted when the hero session also lacks valid zones.
   */
  fallbackZoneMinutes?: string;
};

/** Build typed route params for `router.push(...)`. */
export function buildCardioTodayHrDetailRouteParams(input: {
  day: string;
  fallbackZoneMinutes?: HeartRateZoneMinutesTuple | null;
}): CardioTodayHrDetailRouteParams {
  const encoded = encodeHeartRateZoneMinutesForRoute(input.fallbackZoneMinutes ?? null);
  return {
    day: input.day,
    ...(encoded != null ? { fallbackZoneMinutes: encoded } : {}),
  };
}

/** Modal navigation title — exported so layout / tests can compare. */
export const CARDIO_TODAY_HR_DETAIL_TITLE = "Avg Heart Rate" as const;

/** Graceful copy when HR zone minutes are not yet captured for cardio. */
export const CARDIO_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE =
  "Heart rate zones aren\u2019t available yet." as const;

/** "Average across today's cardio sessions, weighted by duration." */
export const CARDIO_TODAY_HR_DETAIL_VALUE_HINT =
  "Average across today\u2019s cardio sessions, weighted by duration." as const;

function parseDayParam(value: string | string[] | undefined): string | null {
  const v = typeof value === "string" ? value : Array.isArray(value) ? value[0] : null;
  if (v == null) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/**
 * @deprecated Phase D — Apple-Fitness-style `m:ss` rendering replaces the legacy
 * one-decimal "X.X min" formatter. The shared {@link formatZoneDurationMinSec}
 * helper is now the single source of truth and powers both the Strength and Cardio
 * HR detail modals. Kept exported for callers/tests that still consume it.
 */
export function formatCardioTodayZoneMinutesValue(minutes: number | undefined | null): string {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 0) {
    return CARDIO_TODAY_DETAIL_MISSING_VALUE;
  }
  if (minutes === 0) return "0 min";
  const oneDecimal = Math.round(minutes * 10) / 10;
  return `${oneDecimal} min`;
}

export default function CardioTodayHrDetailScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{
    day?: string | string[];
    fallbackZoneMinutes?: string | string[];
  }>();
  const day = parseDayParam(params.day);
  const fallbackZoneMinutes = useMemo(
    () => decodeHeartRateZoneMinutesFromRoute(params.fallbackZoneMinutes),
    [params.fallbackZoneMinutes],
  );

  useEffect(() => {
    if (day == null) router.back();
  }, [day, router]);

  if (day == null) {
    return <View testID="cardio-today-hr-detail-empty" />;
  }

  return <CardioTodayHrDetailInner day={day} fallbackZoneMinutes={fallbackZoneMinutes} />;
}

function CardioTodayHrDetailInner({
  day,
  fallbackZoneMinutes,
}: {
  day: string;
  fallbackZoneMinutes: HeartRateZoneMinutesTuple | null;
}): React.ReactElement {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({ title: CARDIO_TODAY_HR_DETAIL_TITLE });
  }, [navigation]);

  const { energy } = useDailyEnergyCard(day);
  const cardio = energy?.energyInfluencers?.cardio;
  const avgHrBpm = cardio?.averageHeartRateBpm;

  const aggregateZoneMinutes = useMemo(
    () => validateHeartRateZoneMinutesTuple(cardio?.heartRateZoneMinutes ?? null),
    [cardio?.heartRateZoneMinutes],
  );
  const effectiveZoneMinutes: HeartRateZoneMinutesTuple | null =
    aggregateZoneMinutes ?? fallbackZoneMinutes;
  const thresholdsBpm = useMemo(
    () => resolveZoneDisplayThresholdsBpm(cardio?.heartRateZoneBasis ?? null),
    [cardio?.heartRateZoneBasis],
  );

  const avgHrText = useMemo(() => {
    const formatted = formatCardioTodayAvgHeartRateValue(avgHrBpm);
    if (formatted === CARDIO_TODAY_DETAIL_MISSING_VALUE) return formatted;
    // Match Strength HR modal — uppercase BPM in the dominant figure.
    return formatted.replace(/\bbpm\b/, "BPM");
  }, [avgHrBpm]);

  const hasZones = effectiveZoneMinutes != null;
  const maxZoneMinutes = useMemo(() => {
    if (!hasZones) return 0;
    return Math.max(0, ...(effectiveZoneMinutes as HeartRateZoneMinutesTuple));
  }, [hasZones, effectiveZoneMinutes]);

  const rootA11y =
    avgHrText === CARDIO_TODAY_DETAIL_MISSING_VALUE
      ? `${CARDIO_TODAY_HR_DETAIL_TITLE}. Not available. ${
          hasZones ? "" : CARDIO_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE
        }`.trim()
      : `${CARDIO_TODAY_HR_DETAIL_TITLE}. ${avgHrText}. ${
          hasZones ? "" : CARDIO_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE
        }`.trim();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      testID="cardio-today-hr-detail-scroll"
      accessibilityRole="summary"
      accessibilityLabel={rootA11y}
    >
      <View style={styles.headerBlock}>
        <Text style={styles.heroLabel} accessibilityRole="header">
          {CARDIO_TODAY_HR_DETAIL_TITLE}
        </Text>
        <Text
          style={styles.heroValue}
          testID="cardio-today-hr-detail-value"
          accessibilityLabel={
            avgHrText === CARDIO_TODAY_DETAIL_MISSING_VALUE
              ? "Average heart rate not available"
              : `Average heart rate ${avgHrText}`
          }
        >
          {avgHrText}
        </Text>
        <Text style={styles.heroHint} testID="cardio-today-hr-detail-value-hint">
          {CARDIO_TODAY_HR_DETAIL_VALUE_HINT}
        </Text>
      </View>

      <View
        style={styles.zonesBlock}
        testID="cardio-today-hr-detail-zones"
        accessibilityRole="list"
      >
        <Text style={styles.zonesHeading} accessibilityRole="header">
          Zones
        </Text>
        {([0, 1, 2, 3, 4] as const).map((idx) => {
          const minutes = hasZones ? (effectiveZoneMinutes as HeartRateZoneMinutesTuple)[idx] : null;
          return (
            <HrZoneRow
              key={idx}
              zoneNumber={(idx + 1) as 1 | 2 | 3 | 4 | 5}
              zoneLabel={HEART_RATE_ZONE_LABELS[idx]}
              durationLabel={hasZones ? formatZoneDurationMinSec(minutes) : null}
              rangeLabel={formatZoneRangeBpm(idx, thresholdsBpm)}
              minutes={hasZones ? minutes : null}
              maxZoneMinutes={maxZoneMinutes}
              testIDPrefix="cardio-today-hr-detail-zone"
            />
          );
        })}
        {!hasZones ? (
          <Text
            style={styles.zonesUnavailableMessage}
            testID="cardio-today-hr-detail-zones-unavailable"
          >
            {CARDIO_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE}
          </Text>
        ) : null}
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
  zonesUnavailableMessage: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
    color: UI_TEXT_TERTIARY_LABEL,
    marginTop: 10,
  },
});
