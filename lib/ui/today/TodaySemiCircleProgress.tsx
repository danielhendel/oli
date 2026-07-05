import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import { SemiCircleProgressRing } from "@/lib/ui/progress/SemiCircleProgressRing";
import { WEEKLY_FITNESS_BAR_FILL_COLOR } from "@/lib/data/dash/weeklyFitnessDashProgress";
import {
  UI_PROGRESS_TRACK_EMPTY,
  UI_TAB_ROOT_INSET,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

type Props = {
  completionPercent: number | null;
  loading?: boolean;
};

const RING_STROKE = 10;
const RING_MIN_SIZE = 260;
const RING_MAX_SIZE = 340;

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
        <View style={[styles.skArc, { width: ringSize, height: ringSize / 2 }]} />
      </View>
    );
  }

  const label = completionPercent == null ? "—" : `${completionPercent}%`;
  const a11y =
    completionPercent == null
      ? "Today plan completion unavailable."
      : `Today plan ${completionPercent} percent complete.`;

  return (
    <View style={[styles.wrap, { width: ringSize }]} testID="today-semi-circle-progress">
      <SemiCircleProgressRing
        percent={completionPercent}
        size={ringSize}
        strokeWidth={RING_STROKE}
        label={label}
        sublabel="of today's plan complete"
        trackColor={UI_PROGRESS_TRACK_EMPTY}
        progressColor={WEEKLY_FITNESS_BAR_FILL_COLOR}
        accessibilityLabel={a11y}
        testID="today-completion-ring"
        labelStyle={styles.ringLabel}
        sublabelStyle={styles.ringSublabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 4,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 16,
  },
  skArc: {
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    backgroundColor: "rgba(140, 150, 170, 0.14)",
  },
  ringLabel: {
    fontSize: 42,
    lineHeight: 48,
  },
  ringSublabel: {
    color: UI_TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: "500",
  },
});
