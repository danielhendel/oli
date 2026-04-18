import React from "react";
import { StyleSheet, View } from "react-native";

import type { ActivityDayRingPresentation } from "@/lib/ui/activity/activityCalendarDayRingPresentation";
import { ACTIVITY_STEP_TIER_BAR_FILL } from "@/lib/ui/overview/activityStepTierBarFills";
import { ACTIVITY_STEP_RATING_TIERS } from "@/lib/utils/activityStepRating";
import { STEP_TIER_TRACK_INNER_BACKGROUND } from "@/lib/utils/activityStepTierVisual";

const STROKE_WIDTH = 1.75;
const STROKE_WIDTH_EMPHASIZED = 2.85;
const NEUTRAL_FALLBACK_STROKE = "rgba(60, 60, 67, 0.14)";

function tierInnerFill(tierIndex: number): string {
  return ACTIVITY_STEP_RATING_TIERS[tierIndex]!.backgroundColor;
}

export type ActivityDayRingProps = {
  size: number;
  presentation: ActivityDayRingPresentation;
  emphasized?: boolean;
  outerTestID?: string;
};

/** Ring stroke/fill: tier days use Activity bar tokens; past no-data uses neutral track chrome; today has no ring. */
export function ActivityDayRing({ size, presentation, emphasized = false, outerTestID }: ActivityDayRingProps) {
  if (presentation.kind === "hidden" || presentation.kind === "currentDayNoRing") return null;

  if (presentation.kind === "tier") {
    const { tierIndex } = presentation;
    if (tierIndex < 0 || tierIndex >= ACTIVITY_STEP_TIER_BAR_FILL.length) return null;
    const strokeColor = ACTIVITY_STEP_TIER_BAR_FILL[tierIndex]!;
    const diskFill = tierInnerFill(tierIndex);
    const strokeWidth = emphasized ? STROKE_WIDTH_EMPHASIZED : STROKE_WIDTH;
    return (
      <View style={[styles.host, { width: size, height: size, borderRadius: size / 2 }]}>
        <View
          pointerEvents="none"
          style={[
            styles.fillDisk,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: diskFill,
              opacity: emphasized ? 1 : 0.96,
            },
          ]}
        />
        <View
          testID={outerTestID}
          pointerEvents="none"
          style={[
            styles.ringLayer,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: strokeColor,
              opacity: emphasized ? 1 : 0.95,
            },
          ]}
        />
      </View>
    );
  }

  const strokeColor = NEUTRAL_FALLBACK_STROKE;
  const diskFill = STEP_TIER_TRACK_INNER_BACKGROUND;
  const strokeWidth = emphasized ? STROKE_WIDTH_EMPHASIZED : STROKE_WIDTH;
  return (
    <View style={[styles.host, { width: size, height: size, borderRadius: size / 2 }]}>
      <View
        pointerEvents="none"
        style={[
          styles.fillDisk,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: diskFill,
            opacity: emphasized ? 1 : 0.94,
          },
        ]}
      />
      <View
        testID={outerTestID}
        pointerEvents="none"
        style={[
          styles.ringLayer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: strokeColor,
            opacity: emphasized ? 1 : 0.92,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  fillDisk: {
    ...StyleSheet.absoluteFillObject,
  },
  ringLayer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
