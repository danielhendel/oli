import React from "react";
import { StyleSheet, View } from "react-native";

import { SemiCircleProgressRing } from "@/lib/ui/progress/SemiCircleProgressRing";
import { WEEKLY_FITNESS_BAR_FILL_COLOR } from "@/lib/data/dash/weeklyFitnessDashProgress";
import {
  UI_PROGRESS_TRACK_EMPTY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

type Props = {
  completionPercent: number | null;
  loading?: boolean;
};

const RING_SIZE = 200;
const RING_STROKE = 10;

export function TodaySemiCircleProgress({ completionPercent, loading }: Props): React.ReactElement {
  if (loading) {
    return (
      <View style={styles.loadingWrap} testID="today-semi-circle-loading">
        <View style={styles.skArc} />
      </View>
    );
  }

  const label = completionPercent == null ? "—" : `${completionPercent}%`;
  const a11y =
    completionPercent == null
      ? "Today plan completion unavailable."
      : `Today plan ${completionPercent} percent complete.`;

  return (
    <View style={styles.wrap} testID="today-semi-circle-progress">
      <SemiCircleProgressRing
        percent={completionPercent}
        size={RING_SIZE}
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
    alignItems: "center",
    paddingTop: 2,
    paddingBottom: 2,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 16,
  },
  skArc: {
    width: RING_SIZE,
    height: RING_SIZE / 2,
    borderTopLeftRadius: RING_SIZE / 2,
    borderTopRightRadius: RING_SIZE / 2,
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
