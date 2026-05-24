import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View, type ViewProps } from "react-native";

import { useActivityReduceMotion } from "@/lib/ui/activity/useActivityReduceMotion";
import {
  STEP_TIER_TRACK_INNER_BACKGROUND,
  STEP_TIER_TRACK_RIM_BORDER,
  activityStepTierBarVisual,
} from "@/lib/utils/activityStepTierVisual";
import { MODULE_OVERVIEW_SEGMENTED_TRACK } from "@/lib/ui/overview/moduleOverviewSegmentedTrackMetrics";
import { UI_CARD_SURFACE } from "@/lib/ui/theme/uiTokens";

const DEFAULT_BAR_HEIGHT = MODULE_OVERVIEW_SEGMENTED_TRACK.barHeight;
const DEFAULT_TRACK_RADIUS = MODULE_OVERVIEW_SEGMENTED_TRACK.trackRadius;

const EASE_OUT = Easing.out(Easing.cubic);
const DURATION_WIDTH_MS = 260;
const DURATION_COLOR_MS = 280;

export type ActivityTierProgressTrackProps = {
  testID?: string;
  /** Tier 0–5 from {@link getStepRatingTierIndex}; `null` → empty bar (non-numeric / insufficient row). */
  tierIndex: number | null;
  /**
   * When set (Activity Baseline card only), bar width follows this 0–1 value instead of fixed tier-segment
   * widths; tier still controls fill color.
   */
  fillWidth01Override?: number | null;
  /**
   * When set, the fill renders in this color instead of the tier-derived color. Width still animates;
   * the tier-color cross-fade is suppressed. Used by the Activity Overview page to recolor progress
   * bars to the Daily Energy fill color while keeping the bar geometry and tier-driven width logic.
   * Other consumers (Dash, Activity day detail, etc.) omit this and keep tier-colored fills.
   */
  fillColorOverride?: string | null;
  barHeight?: number;
  trackRadius?: number;
  wrapperProps?: Omit<ViewProps, "children" | "onLayout" | "testID" | "style"> & {
    style?: ViewProps["style"];
  };
};

/**
 * Single-color tier fill at fixed width ({@link STEP_TIER_FILL}); neutral track; no marker.
 * Width and fill color animate subtly on tier changes (respects reduce motion).
 */
export function ActivityTierProgressTrack({
  testID,
  tierIndex,
  fillWidth01Override,
  fillColorOverride,
  barHeight = DEFAULT_BAR_HEIGHT,
  trackRadius = DEFAULT_TRACK_RADIUS,
  wrapperProps,
}: ActivityTierProgressTrackProps) {
  const reduceMotion = useActivityReduceMotion();
  const visual = activityStepTierBarVisual(tierIndex);
  const targetFill01 =
    visual != null &&
    fillWidth01Override != null &&
    Number.isFinite(fillWidth01Override)
      ? Math.min(1, Math.max(0, fillWidth01Override))
      : (visual?.fill01 ?? 0);
  const overrideColor =
    fillColorOverride != null && fillColorOverride.length > 0 ? fillColorOverride : null;
  const targetColor = overrideColor ?? visual?.fillColor ?? "rgba(0,0,0,0)";

  const fill01Anim = useRef(new Animated.Value(targetFill01)).current;
  const colorBlend = useRef(new Animated.Value(1)).current;
  const [colorPair, setColorPair] = useState<[string, string]>(() => [targetColor, targetColor]);
  const mounted = useRef(false);
  const animGeneration = useRef(0);
  const endColorRef = useRef(targetColor);

  useEffect(() => {
    const duration = reduceMotion ? 0 : DURATION_WIDTH_MS;
    const colorDuration = reduceMotion ? 0 : DURATION_COLOR_MS;
    const gen = ++animGeneration.current;

    if (!mounted.current) {
      mounted.current = true;
      fill01Anim.setValue(targetFill01);
      colorBlend.setValue(1);
      setColorPair([targetColor, targetColor]);
      endColorRef.current = targetColor;
      return undefined;
    }

    if (tierIndex == null) {
      fill01Anim.setValue(0);
      colorBlend.setValue(1);
      return undefined;
    }

    const fromColor = endColorRef.current;
    const sameHue = fromColor === targetColor;

    setColorPair([fromColor, targetColor]);
    if (sameHue || reduceMotion) {
      colorBlend.setValue(1);
    } else {
      colorBlend.setValue(0);
    }

    const widthAnim = Animated.timing(fill01Anim, {
      toValue: targetFill01,
      duration,
      easing: EASE_OUT,
      useNativeDriver: false,
    });

    const colorAnim =
      sameHue || reduceMotion
        ? null
        : Animated.timing(colorBlend, {
            toValue: 1,
            duration: colorDuration,
            easing: EASE_OUT,
            useNativeDriver: false,
          });

    const anim = colorAnim != null ? Animated.parallel([widthAnim, colorAnim]) : widthAnim;

    anim.start(({ finished }) => {
      if (finished && gen === animGeneration.current) {
        endColorRef.current = targetColor;
      }
    });

    return () => {
      anim.stop();
    };
  }, [tierIndex, fillWidth01Override, targetFill01, targetColor, reduceMotion, fill01Anim, colorBlend]);

  const fillWidthStyle = useMemo(
    () => ({
      width: fill01Anim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
      }),
    }),
    [fill01Anim],
  );

  const fillColorStyle = useMemo(
    () => ({
      backgroundColor: colorBlend.interpolate({
        inputRange: [0, 1],
        outputRange: colorPair,
      }),
    }),
    [colorBlend, colorPair],
  );

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
      style={[styles.trackWrap, { height: barHeight }, wrapperStyle]}
    >
      <View
        style={[
          styles.trackRim,
          {
            height: barHeight,
            borderRadius: trackRadius,
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
              borderRadius: trackRadius,
              height: barHeight,
              backgroundColor: STEP_TIER_TRACK_INNER_BACKGROUND,
            },
          ]}
          importantForAccessibility="no"
        >
          {visual != null ? (
            <Animated.View
              style={[
                styles.fill,
                fillWidthStyle,
                fillColorStyle,
                {
                  height: barHeight,
                  borderTopLeftRadius: trackRadius,
                  borderBottomLeftRadius: trackRadius,
                  borderTopRightRadius: trackRadius,
                  borderBottomRightRadius: trackRadius,
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

/** Re-export for callers that set `accessibilityValue` on the wrapper (progressbar). */
export function activityTierProgressAccessibilityPercent(
  tierIndex: number | null,
  opts?: { fillWidth01Override?: number | null },
): number {
  const visual = activityStepTierBarVisual(tierIndex);
  const o = opts?.fillWidth01Override;
  if (visual != null && o != null && Number.isFinite(o)) {
    return Math.round(Math.min(1, Math.max(0, o)) * 100);
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
