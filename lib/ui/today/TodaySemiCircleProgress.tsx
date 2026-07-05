import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import { SemiCircleProgressRing } from "@/lib/ui/progress/SemiCircleProgressRing";
import { WEEKLY_FITNESS_BAR_FILL_COLOR } from "@/lib/data/dash/weeklyFitnessDashProgress";
import { UI_PROGRESS_TRACK_EMPTY, UI_TAB_ROOT_INSET } from "@/lib/ui/theme/uiTokens";

type Props = {
  completionPercent: number | null;
  loading?: boolean;
};

const RING_STROKE = 9;
const RING_MIN_SIZE = 260;
const RING_MAX_SIZE = 320;
/** Shorter visible arc — wide but less vertical dominance. */
const RING_CLIP_HEIGHT_RATIO = 0.36;

function ringSizeForWindowWidth(windowWidth: number): number {
  const contentWidth = windowWidth - UI_TAB_ROOT_INSET * 2;
  return Math.round(Math.min(RING_MAX_SIZE, Math.max(RING_MIN_SIZE, contentWidth)));
}

export function TodaySemiCircleProgress({ completionPercent, loading }: Props): React.ReactElement {
  const { width: windowWidth } = useWindowDimensions();
  const ringSize = ringSizeForWindowWidth(windowWidth);

  if (loading) {
    return (
      <View style={styles.loadingWrap} testID="today-semi-circle-loading">
        <View
          style={[
            styles.skArc,
            { width: ringSize, height: Math.round(ringSize * RING_CLIP_HEIGHT_RATIO) },
          ]}
        />
      </View>
    );
  }

  const label = completionPercent == null ? "—" : `${completionPercent}%`;
  const a11y =
    completionPercent == null
      ? "Today plan completion unavailable."
      : `${completionPercent} percent of today's plan complete.`;

  return (
    <View style={[styles.wrap, { width: ringSize }]} testID="today-semi-circle-progress">
      <SemiCircleProgressRing
        percent={completionPercent}
        size={ringSize}
        strokeWidth={RING_STROKE}
        clipHeightRatio={RING_CLIP_HEIGHT_RATIO}
        label={label}
        showSublabel={false}
        trackColor={UI_PROGRESS_TRACK_EMPTY}
        progressColor={WEEKLY_FITNESS_BAR_FILL_COLOR}
        accessibilityLabel={a11y}
        testID="today-completion-ring"
        labelStyle={styles.ringLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    alignItems: "center",
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: -4,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 8,
  },
  skArc: {
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    backgroundColor: "rgba(140, 150, 170, 0.14)",
  },
  ringLabel: {
    fontSize: 56,
    lineHeight: 62,
    fontWeight: "700",
    letterSpacing: -1,
  },
});
