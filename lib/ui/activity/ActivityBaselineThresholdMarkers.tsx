import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import {
  activityBaselineThresholdLabelLeftPx,
  activityBaselineThresholdTickLeftPx,
} from "@/lib/ui/activity/activityBaselineMarkerLayout";
import { ACTIVITY_BASELINE_MARKER_DISPLAY_STEP_STEPS } from "@/lib/utils/activityStepRating";

/** Parallel to {@link ACTIVITY_BASELINE_MARKER_DISPLAY_STEP_STEPS} (same order, same length). */
const MARKER_LABELS = ["0", "2.5k", "5k", "7.5k", "10k", "12.5k", "15k"] as const;

/** At least 1px so ticks stay visible on high-DPI; aligns to scale with track rim hairline. */
const TICK_WIDTH_PX = Math.max(1, StyleSheet.hairlineWidth * 2);
const TICK_HEIGHT_PX = 5;
/** One visual unit: tick + label; `top` places label under the tick. */
const LABEL_TOP_PX = TICK_HEIGHT_PX + 1;

/**
 * Baseline-only ruler: ticks + labels on {@link ACTIVITY_BASELINE_MARKER_DISPLAY_STEP_STEPS}, same 0→15k
 * linear scale as {@link ActivityTierProgressTrack} bounded fill (rim inset matches track).
 */
export function ActivityBaselineThresholdMarkers() {
  const [outerW, setOuterW] = useState(0);
  const [labelWidths, setLabelWidths] = useState<(number | null)[]>(() =>
    Array.from({ length: MARKER_LABELS.length }, () => null),
  );

  const prevOuterW = useRef(0);
  useEffect(() => {
    if (outerW <= 0) return;
    if (prevOuterW.current > 0 && prevOuterW.current !== outerW) {
      setLabelWidths(Array.from({ length: MARKER_LABELS.length }, () => null));
    }
    prevOuterW.current = outerW;
  }, [outerW]);

  const onRowLayout = useCallback((e: LayoutChangeEvent) => {
    setOuterW(e.nativeEvent.layout.width);
  }, []);

  const onLabelTextLayout = useCallback((index: number, width: number) => {
    setLabelWidths((prev) => {
      if (prev[index] === width) return prev;
      const next = [...prev];
      next[index] = width;
      return next;
    });
  }, []);

  const allMeasured =
    outerW > 0 && labelWidths.every((w) => w != null && Number.isFinite(w) && (w as number) > 0);

  return (
    <View style={styles.wrap} testID="activity-baseline-threshold-markers" onLayout={onRowLayout}>
      {!allMeasured ? (
        <View style={styles.measureRow} pointerEvents="none">
          {MARKER_LABELS.map((lab, i) => (
            <Text
              key={`measure-${i}`}
              style={styles.label}
              onTextLayout={(e) => {
                const lines = e.nativeEvent.lines;
                const w = lines.reduce((max, line) => Math.max(max, line.width), 0);
                onLabelTextLayout(i, w);
              }}
            >
              {lab}
            </Text>
          ))}
        </View>
      ) : (
        ACTIVITY_BASELINE_MARKER_DISPLAY_STEP_STEPS.map((thresholdSteps, i) => (
          <Fragment key={thresholdSteps}>
            <View
              style={[
                styles.tick,
                {
                  left: activityBaselineThresholdTickLeftPx(outerW, thresholdSteps, TICK_WIDTH_PX),
                  width: TICK_WIDTH_PX,
                },
              ]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text
              style={[
                styles.label,
                styles.labelPositioned,
                {
                  left: activityBaselineThresholdLabelLeftPx(outerW, thresholdSteps, labelWidths[i]!),
                },
              ]}
              numberOfLines={1}
              testID={`activity-baseline-marker-label-${i}`}
            >
              {MARKER_LABELS[i]!}
            </Text>
          </Fragment>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    width: "100%",
    minHeight: LABEL_TOP_PX + 11,
    marginTop: 0,
  },
  measureRow: {
    flexDirection: "row",
    opacity: 0,
    height: LABEL_TOP_PX + 11,
    overflow: "hidden",
    gap: 8,
  },
  tick: {
    position: "absolute",
    top: 0,
    height: TICK_HEIGHT_PX,
    backgroundColor: "rgba(60, 60, 67, 0.14)",
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: "#636366",
    letterSpacing: -0.08,
  },
  labelPositioned: {
    position: "absolute",
    top: LABEL_TOP_PX,
  },
});
