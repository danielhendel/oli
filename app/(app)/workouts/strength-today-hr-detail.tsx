/**
 * Strength Today — Avg Heart Rate detail modal.
 *
 * Screen-as-modal (registered with `presentation: "modal"` in `app/(app)/_layout.tsx`),
 * mirroring `today-muscle-group.tsx` / `energy-metric-explainer.tsx`. This component:
 *
 * - Primary truth: `DailyEnergyCardDto.energyInfluencers.strength.{averageHeartRateBpm,
 *   heartRateZoneMinutes, heartRateZoneBasis}` via `useDailyEnergyCard(day)`.
 * - **Session-level fallback**: when the daily aggregate is missing zone minutes (typically
 *   when `DailyFacts.strength.heartRateZoneMinutes` hasn't been recomputed since Phase C
 *   shipped), the modal falls back to the picked strength session's `heartRateZoneMinutes`
 *   passed verbatim through route params from `overview.tsx`. The basis falls back to
 *   `DEFAULT_WORKOUT_HR_ZONE_THRESHOLDS_BPM` (Phase B's only model). No raw mutation, no
 *   invented zones.
 * - Renders Avg HR (rounded, "{n} BPM") or `STRENGTH_TODAY_DETAIL_MISSING_VALUE` when missing.
 * - Renders the shared {@link HrZoneRow} for Zones 1–5 with a proportional blue progress bar,
 *   `m:ss` Apple-Fitness duration, and the derived HR range. When zones are unavailable from
 *   BOTH the daily aggregate and the session fallback, the list renders the graceful
 *   "zones aren't available yet" copy AFTER the avg HR figure — never inventing values.
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
import { isValidAverageHeartRateBpm } from "@/lib/data/workouts/resolveStrengthTodayAverageHeartRateBpm";
import { HrZoneRow } from "@/lib/ui/workouts/HrZoneRow";
import { WORKOUTS_SCREEN_CONTENT_BG } from "@/lib/ui/headers/workoutsStackHeader";
import {
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
  /**
   * Session-level zone fallback — comma-separated 5-tuple of fractional minutes for the
   * picked strength session, used ONLY when `DailyFacts.strength.heartRateZoneMinutes`
   * is missing (e.g. days that haven't been recomputed since Phase C deploy). Omitted
   * when the picked session also lacks valid zones. See
   * `encodeHeartRateZoneMinutesForRoute` for the codec.
   */
  fallbackZoneMinutes?: string;
  /**
   * Session-level avg HR fallback (decimal string) when `DailyFacts.strength.averageHeartRateBpm`
   * is missing. Omitted when session physiology is also absent.
   */
  fallbackAverageHeartRateBpm?: string;
};

/** Build typed route params for `router.push(...)`. */
export function buildStrengthTodayHrDetailRouteParams(input: {
  day: string;
  fallbackZoneMinutes?: HeartRateZoneMinutesTuple | null;
  fallbackAverageHeartRateBpm?: number | null;
}): StrengthTodayHrDetailRouteParams {
  const encoded = encodeHeartRateZoneMinutesForRoute(input.fallbackZoneMinutes ?? null);
  const bpm =
    typeof input.fallbackAverageHeartRateBpm === "number" &&
    Number.isFinite(input.fallbackAverageHeartRateBpm) &&
    input.fallbackAverageHeartRateBpm > 0
      ? String(input.fallbackAverageHeartRateBpm)
      : null;
  return {
    day: input.day,
    ...(encoded != null ? { fallbackZoneMinutes: encoded } : {}),
    ...(bpm != null ? { fallbackAverageHeartRateBpm: bpm } : {}),
  };
}

/** Modal navigation title — exported so layout / tests can compare. */
export const STRENGTH_TODAY_HR_DETAIL_TITLE = "Avg Heart Rate" as const;

/** Graceful copy when HR zone minutes are not yet captured in our pipeline. */
export const STRENGTH_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE =
  "Heart rate zones aren\u2019t available yet." as const;

/** "Average across today's strength sessions, weighted by duration." */
export const STRENGTH_TODAY_HR_DETAIL_VALUE_HINT =
  "Average across today\u2019s strength sessions, weighted by duration." as const;

/**
 * @deprecated Phase D — Apple-Fitness-style `m:ss` rendering replaces the legacy
 * one-decimal "X.X min" formatter. The shared {@link formatZoneDurationMinSec}
 * helper is now the single source of truth and powers both the Strength and Cardio
 * HR detail modals. Kept exported for callers/tests that still consume it; new
 * surfaces should not use it.
 */
export function formatStrengthTodayZoneMinutesValue(
  minutes: number | undefined | null,
): string {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 0) {
    return STRENGTH_TODAY_DETAIL_MISSING_VALUE;
  }
  if (minutes === 0) return "0 min";
  const oneDecimal = Math.round(minutes * 10) / 10;
  return `${oneDecimal} min`;
}

function parseDayParam(value: string | string[] | undefined): string | null {
  const v = typeof value === "string" ? value : Array.isArray(value) ? value[0] : null;
  if (v == null) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function parseFallbackAverageHeartRateBpmParam(
  value: string | string[] | undefined,
): number | null {
  const v = typeof value === "string" ? value : Array.isArray(value) ? value[0] : null;
  if (v == null) return null;
  const n = Number(v);
  return isValidAverageHeartRateBpm(n) ? n : null;
}

export default function StrengthTodayHrDetailScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{
    day?: string | string[];
    fallbackZoneMinutes?: string | string[];
    fallbackAverageHeartRateBpm?: string | string[];
  }>();
  const day = parseDayParam(params.day);
  const fallbackZoneMinutes = useMemo(
    () => decodeHeartRateZoneMinutesFromRoute(params.fallbackZoneMinutes),
    [params.fallbackZoneMinutes],
  );
  const fallbackAverageHeartRateBpm = useMemo(
    () => parseFallbackAverageHeartRateBpmParam(params.fallbackAverageHeartRateBpm),
    [params.fallbackAverageHeartRateBpm],
  );

  useEffect(() => {
    if (day == null) router.back();
  }, [day, router]);

  if (day == null) {
    return <View testID="strength-today-hr-detail-empty" />;
  }

  return (
    <StrengthTodayHrDetailInner
      day={day}
      fallbackZoneMinutes={fallbackZoneMinutes}
      fallbackAverageHeartRateBpm={fallbackAverageHeartRateBpm}
    />
  );
}

function StrengthTodayHrDetailInner({
  day,
  fallbackZoneMinutes,
  fallbackAverageHeartRateBpm,
}: {
  day: string;
  fallbackZoneMinutes: HeartRateZoneMinutesTuple | null;
  fallbackAverageHeartRateBpm: number | null;
}): React.ReactElement {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({ title: STRENGTH_TODAY_HR_DETAIL_TITLE });
  }, [navigation]);

  const { energy } = useDailyEnergyCard(day);
  const strength = energy?.energyInfluencers?.strength;
  const avgHrBpm = isValidAverageHeartRateBpm(strength?.averageHeartRateBpm)
    ? strength.averageHeartRateBpm
    : fallbackAverageHeartRateBpm;

  // Prefer the daily aggregate; fall back to the session-level tuple from route params.
  // The daily aggregate is the truth when present (cross-session basis agreement is
  // enforced server-side). The fallback covers the recompute-lag window after the
  // Phase C deploy and is sourced 1:1 from canonical `workout.heartRateZoneMinutes`
  // (parsed client-side; no fabrication).
  const aggregateZoneMinutes = useMemo(
    () => validateHeartRateZoneMinutesTuple(strength?.heartRateZoneMinutes ?? null),
    [strength?.heartRateZoneMinutes],
  );
  const effectiveZoneMinutes: HeartRateZoneMinutesTuple | null =
    aggregateZoneMinutes ?? fallbackZoneMinutes;
  const thresholdsBpm = useMemo(
    () => resolveZoneDisplayThresholdsBpm(strength?.heartRateZoneBasis ?? null),
    [strength?.heartRateZoneBasis],
  );

  const avgHrText = useMemo(() => {
    const formatted = formatStrengthTodayAvgHeartRateValue(avgHrBpm);
    if (formatted === STRENGTH_TODAY_DETAIL_MISSING_VALUE) return formatted;
    // The detail modal renders BPM in uppercase for the dominant figure — the row formatter
    // returns lowercase "bpm" for the Today card row. Re-cased here on purpose.
    return formatted.replace(/\bbpm\b/, "BPM");
  }, [avgHrBpm]);

  const hasZones = effectiveZoneMinutes != null;
  const maxZoneMinutes = useMemo(() => {
    if (!hasZones) return 0;
    return Math.max(0, ...(effectiveZoneMinutes as HeartRateZoneMinutesTuple));
  }, [hasZones, effectiveZoneMinutes]);

  const rootA11y =
    avgHrText === STRENGTH_TODAY_DETAIL_MISSING_VALUE
      ? `${STRENGTH_TODAY_HR_DETAIL_TITLE}. Not available. ${
          hasZones ? "" : STRENGTH_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE
        }`.trim()
      : `${STRENGTH_TODAY_HR_DETAIL_TITLE}. ${avgHrText}. ${
          hasZones ? "" : STRENGTH_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE
        }`.trim();

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
              testIDPrefix="strength-today-hr-detail-zone"
            />
          );
        })}
        {!hasZones ? (
          <Text
            style={styles.zonesUnavailableMessage}
            testID="strength-today-hr-detail-zones-unavailable"
          >
            {STRENGTH_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE}
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
