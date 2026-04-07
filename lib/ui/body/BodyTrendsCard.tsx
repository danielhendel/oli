import React, { useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { BodyTrendsV1 } from "@/lib/data/body/useBodyOverviewData";
import { formatBodyWeight } from "@/lib/ui/body/bodyMetricFormatting";
import { ErrorState, LoadingState } from "@/lib/ui/ScreenStates";
import { workoutOverviewInCardHeaderStyles } from "@/lib/ui/workouts/workoutOverviewInCardHeaderStyles";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { MODULE_OVERVIEW_SEGMENTED_TRACK } from "@/lib/ui/overview/moduleOverviewSegmentedTrackMetrics";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_FILL_11 } from "@/lib/ui/theme/systemAccent";

const BAND_DOT = MODULE_OVERVIEW_SEGMENTED_TRACK.dotSize;
/** Full pill bar; matches overview track height for visual consistency. */
const BAND_TRACK_H = MODULE_OVERVIEW_SEGMENTED_TRACK.barHeight;
const BAND_RADIUS = BAND_TRACK_H / 2;

const os = typeof Platform !== "undefined" && Platform.OS != null ? Platform.OS : "ios";

const TRACK_SHADOW =
  os === "ios"
    ? {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      }
    : os === "android"
      ? { elevation: 2 }
      : {};

const MARKER_SHADOW =
  os === "ios"
    ? {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      }
    : os === "android"
      ? { elevation: 1 }
      : {};

function arrowForSigned(delta: number): "↓" | "↑" | "→" {
  if (delta < 0) return "↓";
  if (delta > 0) return "↑";
  return "→";
}

/** `useWeightSeries` `weeklyDeltaKg`: latest sample vs last sample on/before 7 calendar days before latest day. */
function formatWeeklyThisWeekLine(deltaKg: number | null, unit: "kg" | "lb"): string | null {
  if (deltaKg == null) return null;
  if (Math.abs(deltaKg) < 1e-6) return "No change this week";
  const arrow = arrowForSigned(deltaKg);
  const mag = formatBodyWeight(Math.abs(deltaKg), unit);
  return `${arrow} ${mag} this week`;
}

/** Maps current weight onto [0,1] along the YTD min–max weight span (display only). */
function ytdBandMarker01(lowKg: number, highKg: number, currentKg: number): number {
  if (!Number.isFinite(lowKg) || !Number.isFinite(highKg) || !Number.isFinite(currentKg)) return 0.5;
  if (highKg <= lowKg) return 0.5;
  const t = (currentKg - lowKg) / (highKg - lowKg);
  return Math.min(1, Math.max(0, t));
}

export type BodyTrendsCardProps = {
  unit: "kg" | "lb";
  trends: BodyTrendsV1;
  onRetryYtd?: () => void;
};

function YtdBandTrack({
  lowKg,
  highKg,
  currentKg,
  unit,
}: {
  lowKg: number;
  highKg: number;
  currentKg: number;
  unit: "kg" | "lb";
}) {
  const [trackW, setTrackW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - trackW) > 0.5) setTrackW(w);
  };
  const t = ytdBandMarker01(lowKg, highKg, currentKg);
  const dotLeftPx =
    trackW > 0 ? Math.min(trackW - BAND_DOT, Math.max(0, t * trackW - BAND_DOT / 2)) : undefined;

  return (
    <View
      style={styles.bandTrackWrap}
      onLayout={onLayout}
      accessibilityRole="none"
      accessibilityLabel={`Year-to-date weight from ${formatBodyWeight(lowKg, unit)} to ${formatBodyWeight(highKg, unit)}, current ${formatBodyWeight(currentKg, unit)}`}
    >
      <View style={[styles.bandTrackRim, TRACK_SHADOW]}>
        <View style={styles.bandTrack}>
          {dotLeftPx != null ? (
            <View
              style={[styles.bandDot, { left: dotLeftPx }, MARKER_SHADOW]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function BodyTrendsCard({ unit, trends, onRetryYtd }: BodyTrendsCardProps) {
  const { latest, ytd } = trends;
  const title = `${ytd.trendYear} Weight Trend`;

  const weightPrimary =
    latest.currentKg != null ? formatBodyWeight(latest.currentKg, unit) : "—";

  const weeklyLine =
    latest.seriesStatus === "ready" ? formatWeeklyThisWeekLine(latest.weeklyDeltaKg, unit) : null;

  const showBand =
    ytd.trendsStatus === "ready" &&
    ytd.bandLowKg != null &&
    ytd.bandHighKg != null &&
    ytd.bandCurrentKg != null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={workoutOverviewInCardHeaderStyles.title}>{title}</Text>
      </View>

      <View style={styles.weightTrendSection}>
        <Text style={styles.heroLabel}>Latest</Text>
        <View style={styles.latestRow}>
          <Text style={styles.heroValue}>{weightPrimary}</Text>
          {latest.seriesStatus === "partial" ? (
            <ActivityIndicator accessibilityLabel="Loading weekly change" size="small" color="#AEAEB2" />
          ) : weeklyLine != null ? (
            <Text style={styles.weeklyLine}>{weeklyLine}</Text>
          ) : null}
        </View>

        <View style={styles.majorSeparator} />

        <View style={styles.ytdSection}>
          <Text style={styles.sectionLabel}>YTD</Text>

          {ytd.trendsStatus === "partial" ? (
            <LoadingState message="Loading…" variant="inline" />
          ) : ytd.trendsStatus === "error" ? (
            <ErrorState
              variant="inline"
              title="Couldn’t load year-to-date"
              message={ytd.errorMessage ?? "Something went wrong"}
              {...(typeof ytd.requestId === "string" ? { requestId: ytd.requestId } : {})}
              {...(onRetryYtd != null ? { onRetry: onRetryYtd } : {})}
            />
          ) : showBand ? (
            <View style={styles.ytdBandBlock}>
              <View style={styles.bandValuesAbove}>
                <Text style={styles.bandValueAbove} numberOfLines={1}>
                  {formatBodyWeight(ytd.bandLowKg!, unit)}
                </Text>
                <Text style={[styles.bandValueAbove, styles.bandValueAboveEnd]} numberOfLines={1}>
                  {formatBodyWeight(ytd.bandHighKg!, unit)}
                </Text>
              </View>

              <View style={styles.bandTrackSlot}>
                <YtdBandTrack
                  lowKg={ytd.bandLowKg!}
                  highKg={ytd.bandHighKg!}
                  currentKg={ytd.bandCurrentKg!}
                  unit={unit}
                />
              </View>

              <View style={styles.bandLabelsBelow}>
                <Text style={styles.bandLabelBelow}>Low</Text>
                <Text style={[styles.bandLabelBelow, styles.bandLabelBelowEnd]}>High</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.ytdEmpty}>No weight samples in this year yet</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 14,
    ...elevatedCardSurfaceStyle,
  },
  headerRow: {
    paddingBottom: 4,
  },
  weightTrendSection: {
    gap: 8,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6E6E73",
    marginTop: 2,
  },
  latestRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: 10,
    rowGap: 6,
  },
  heroValue: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1C1C1E",
    letterSpacing: -0.45,
  },
  /** Same hue as YTD track wash ({@link SYSTEM_ACCENT_FILL_11}); full-opacity system accent for legibility. */
  weeklyLine: {
    fontSize: 14,
    fontWeight: "500",
    color: SYSTEM_ACCENT,
    letterSpacing: -0.12,
    flexShrink: 1,
  },
  majorSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E5EA",
    marginTop: 14,
    marginBottom: 6,
  },
  ytdSection: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6E6E73",
    letterSpacing: -0.1,
  },
  ytdBandBlock: {
    gap: 10,
    marginTop: 2,
  },
  bandValuesAbove: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },
  bandValueAbove: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
    fontVariant: ["tabular-nums"],
  },
  bandValueAboveEnd: {
    textAlign: "right",
  },
  bandTrackSlot: {
    paddingVertical: 2,
  },
  bandLabelsBelow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginTop: -2,
  },
  bandLabelBelow: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: "600",
    color: "#8E8E93",
  },
  bandLabelBelowEnd: {
    textAlign: "right",
  },
  ytdEmpty: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8E8E93",
    marginTop: 2,
  },
  bandTrackWrap: {
    width: "100%",
  },
  bandTrackRim: {
    width: "100%",
    borderRadius: BAND_RADIUS,
    backgroundColor: SYSTEM_ACCENT_FILL_11,
    borderWidth: 1,
    borderColor: "rgba(60, 60, 67, 0.08)",
  },
  bandTrack: {
    height: BAND_TRACK_H,
    borderRadius: BAND_RADIUS,
    position: "relative",
    overflow: "visible",
  },
  bandDot: {
    position: "absolute",
    width: BAND_DOT,
    height: BAND_DOT,
    borderRadius: BAND_DOT / 2,
    top: (BAND_TRACK_H - BAND_DOT) / 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#636366",
  },
});
