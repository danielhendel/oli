import React from "react";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";

import { MODULE_OVERVIEW_SEGMENTED_TRACK } from "@/lib/ui/overview/moduleOverviewSegmentedTrackMetrics";
import {
  activityStepTierBarVisual,
  STEP_TIER_TRACK_INNER_BACKGROUND,
  STEP_TIER_TRACK_RIM_BORDER,
} from "@/lib/utils/activityStepTierVisual";

import { UI_CARD_SURFACE } from "@/lib/ui/theme/uiTokens";
const DEFAULT_BAR_HEIGHT = MODULE_OVERVIEW_SEGMENTED_TRACK.barHeight;
const DEFAULT_TRACK_RADIUS = MODULE_OVERVIEW_SEGMENTED_TRACK.trackRadius;

export type StrengthBaselineFrequencyTrackProps = {
  testID?: string;
  tierIndex: number;
  /** Bounded 0 → 1 along the weekly frequency ruler (typically avg/7). */
  fillWidth01: number;
  wrapperProps?: Omit<ViewProps, "children" | "onLayout" | "testID" | "style"> & {
    style?: ViewProps["style"];
  };
};

/** Static Activity-baseline-style bar (no Animated / Easing) — matches {@link ActivityTierProgressTrack} shell. */
export function StrengthBaselineFrequencyTrack({
  testID,
  tierIndex,
  fillWidth01,
  wrapperProps,
}: StrengthBaselineFrequencyTrackProps) {
  const visual = activityStepTierBarVisual(tierIndex);
  const w01 = Math.min(1, Math.max(0, Number.isFinite(fillWidth01) ? fillWidth01 : 0));
  const pct = Math.round(w01 * 100);
  const fillColor = visual?.fillColor ?? "rgba(0,0,0,0)";

  const os = typeof Platform !== "undefined" && Platform.OS != null ? Platform.OS : "ios";
  const rimShadow =
    os === "ios"
      ? {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        }
      : os === "android"
        ? { elevation: 1 }
        : {};

  const { style: wrapperStyle, ...wrapperRest } = wrapperProps ?? {};

  return (
    <View
      {...wrapperRest}
      {...(testID != null ? { testID } : {})}
      style={[styles.trackWrap, { height: DEFAULT_BAR_HEIGHT }, wrapperStyle]}
    >
      <View
        style={[
          styles.trackRim,
          {
            height: DEFAULT_BAR_HEIGHT,
            borderRadius: DEFAULT_TRACK_RADIUS,
            borderColor: STEP_TIER_TRACK_RIM_BORDER,
            ...rimShadow,
          },
        ]}
        importantForAccessibility="no"
      >
        <View
          style={[
            styles.trackInner,
            {
              borderRadius: DEFAULT_TRACK_RADIUS,
              height: DEFAULT_BAR_HEIGHT,
              backgroundColor: STEP_TIER_TRACK_INNER_BACKGROUND,
            },
          ]}
          importantForAccessibility="no"
        >
          {visual != null ? (
            <View
              style={[
                styles.fill,
                {
                  width: `${pct}%`,
                  height: DEFAULT_BAR_HEIGHT,
                  backgroundColor: fillColor,
                  borderTopLeftRadius: DEFAULT_TRACK_RADIUS,
                  borderBottomLeftRadius: DEFAULT_TRACK_RADIUS,
                  borderTopRightRadius: DEFAULT_TRACK_RADIUS,
                  borderBottomRightRadius: DEFAULT_TRACK_RADIUS,
                },
              ]}
              importantForAccessibility="no"
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function strengthBaselineFrequencyTrackAccessibilityPercent(tierIndex: number, fillWidth01: number): number {
  const visual = activityStepTierBarVisual(tierIndex);
  const w01 = Math.min(1, Math.max(0, Number.isFinite(fillWidth01) ? fillWidth01 : 0));
  if (visual != null && Number.isFinite(fillWidth01)) {
    return Math.round(w01 * 100);
  }
  return visual != null ? Math.round(visual.fill01 * 100) : 0;
}

const styles = StyleSheet.create({
  trackWrap: {
    width: "100%",
    position: "relative",
    justifyContent: "center",
  },
  trackRim: {
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: UI_CARD_SURFACE,
  },
  trackInner: {
    position: "relative",
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
