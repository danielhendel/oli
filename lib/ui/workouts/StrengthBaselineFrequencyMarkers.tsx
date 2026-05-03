import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import {
  STRENGTH_BASELINE_WEEKLY_FREQUENCY_DISPLAY_MAX,
} from "@/lib/utils/strengthWeeklyFrequencyRating";
import {
  strengthBaselineFrequencyThresholdLabelLeftPx,
  strengthBaselineFrequencyThresholdTickLeftPx,
} from "@/lib/ui/workouts/strengthBaselineMarkerLayout";

/** Integer markers on 0 → {@link STRENGTH_BASELINE_WEEKLY_FREQUENCY_DISPLAY_MAX} inclusive. */
const FREQUENCY_MARKER_VALUES = Array.from({ length: STRENGTH_BASELINE_WEEKLY_FREQUENCY_DISPLAY_MAX + 1 }, (_, i) => i);

const MARKER_LABELS = FREQUENCY_MARKER_VALUES.map(String) as readonly string[];

const TICK_WIDTH_PX = Math.max(1, StyleSheet.hairlineWidth * 2);
const TICK_HEIGHT_PX = 5;
const LABEL_TOP_PX = TICK_HEIGHT_PX + 1;

/**
 * Baseline ruler for weekly frequency (matches {@link ActivityBaselineThresholdMarkers} geometry; linear 0→7 scale).
 */
export function StrengthBaselineFrequencyMarkers() {
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
    <View style={styles.wrap} testID="strength-baseline-frequency-markers" onLayout={onRowLayout}>
      {!allMeasured ? (
        <View style={styles.measureRow} pointerEvents="none">
          {MARKER_LABELS.map((lab, i) => (
            <Text
              key={`measure-${i}`}
              testID={`strength-baseline-marker-measure-${FREQUENCY_MARKER_VALUES[i]}`}
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
        FREQUENCY_MARKER_VALUES.map((frequency, i) => (
          <Fragment key={frequency}>
            <View
              style={[
                styles.tick,
                {
                  left: strengthBaselineFrequencyThresholdTickLeftPx(outerW, frequency, TICK_WIDTH_PX),
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
                  left: strengthBaselineFrequencyThresholdLabelLeftPx(
                    outerW,
                    frequency,
                    labelWidths[i]!,
                  ),
                },
              ]}
              numberOfLines={1}
              testID={`strength-baseline-marker-label-${frequency}`}
            >
              {MARKER_LABELS[i]}
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
