import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import { CARDIO_BASELINE_MARKER_VALUES_MILES } from "@/lib/ui/workouts/cardioBaselineScale";
import { UI_TEXT_TERTIARY_LABEL } from "@/lib/ui/theme/uiTokens";
import {
  CARDIO_BASELINE_MARKER_TICK_WIDTH_PX,
  cardioBaselineMarkerLabelLeftPx,
  cardioBaselineMarkerTickLeftPx,
} from "@/lib/ui/workouts/cardioBaselineMarkerLayout";

const TICK_HEIGHT_PX = 5;
const LABEL_TOP_PX = TICK_HEIGHT_PX + 1;

function markerDisplayLabel(miles: number, index: number, total: number): string {
  if (index === total - 1) return "40+";
  return String(miles);
}

const MARKER_COUNT = CARDIO_BASELINE_MARKER_VALUES_MILES.length;

/** Boundary ticks for cardio weekly miles — positions use equal-width tier scale (see cardioBaselineScale). */
export function CardioBaselineFrequencyMarkers() {
  const [outerW, setOuterW] = useState(0);
  const [labelWidths, setLabelWidths] = useState<(number | null)[]>(() =>
    Array.from({ length: MARKER_COUNT }, () => null),
  );

  const prevOuterW = useRef(0);
  useEffect(() => {
    if (outerW <= 0) return;
    if (prevOuterW.current > 0 && prevOuterW.current !== outerW) {
      setLabelWidths(Array.from({ length: MARKER_COUNT }, () => null));
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
    <View style={styles.wrap} testID="cardio-baseline-frequency-markers" onLayout={onRowLayout}>
      {!allMeasured ? (
        <View style={styles.measureRow} pointerEvents="none">
          {CARDIO_BASELINE_MARKER_VALUES_MILES.map((miles, i, arr) => (
            <Text
              key={`measure-${i}`}
              testID={`cardio-baseline-marker-measure-${CARDIO_BASELINE_MARKER_VALUES_MILES[i]}`}
              style={styles.label}
              onTextLayout={(e) => {
                const lines = e.nativeEvent.lines;
                const w = lines.reduce((max, line) => Math.max(max, line.width), 0);
                onLabelTextLayout(i, w);
              }}
            >
              {markerDisplayLabel(miles, i, arr.length)}
            </Text>
          ))}
        </View>
      ) : (
        CARDIO_BASELINE_MARKER_VALUES_MILES.map((_, i) => (
          <Fragment key={CARDIO_BASELINE_MARKER_VALUES_MILES[i]}>
            <View
              style={[
                styles.tick,
                {
                  left: cardioBaselineMarkerTickLeftPx(outerW, i, CARDIO_BASELINE_MARKER_TICK_WIDTH_PX),
                  width: CARDIO_BASELINE_MARKER_TICK_WIDTH_PX,
                },
              ]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text
              style={[styles.label, styles.labelPositioned, { left: cardioBaselineMarkerLabelLeftPx(outerW, i, labelWidths[i]!) }]}
              numberOfLines={1}
              testID={`cardio-baseline-marker-label-${CARDIO_BASELINE_MARKER_VALUES_MILES[i]}`}
            >
              {markerDisplayLabel(CARDIO_BASELINE_MARKER_VALUES_MILES[i]!, i, CARDIO_BASELINE_MARKER_VALUES_MILES.length)}
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
    color: UI_TEXT_TERTIARY_LABEL,
    letterSpacing: -0.08,
  },
  labelPositioned: {
    position: "absolute",
    top: LABEL_TOP_PX,
  },
});
