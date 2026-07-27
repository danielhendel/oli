/**
 * Readiness contributor four-zone provider-score bar (Views only).
 * Presentation only — fractions, labels, and marker come from the view model.
 *
 * Pay Attention → Fair → Good → Optimal with a single white current marker.
 * No legend. No second marker. No medical-range title. No progress animation.
 *
 * Zone flex uses true 0–100 proportional fractions from the view model.
 * Label columns use a small presentation floor so narrow iPhones remain readable
 * without changing marker geometry or classification boundaries.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  UI_READINESS_SCORE_FAIR_FILL,
  UI_READINESS_SCORE_GOOD_FILL,
  UI_READINESS_SCORE_OPTIMAL_BORDER,
  UI_READINESS_SCORE_OPTIMAL_FILL,
  UI_READINESS_SCORE_PAY_ATTENTION_FILL,
} from "@/lib/ui/theme/readinessContributorScoreChrome";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type ReadinessContributorScoreBarProps = {
  supportingLabel: string;
  payAttentionLabel: string;
  fairLabel: string;
  goodLabel: string;
  optimalLabel: string;
  payAttentionRangeText: string;
  fairRangeText: string;
  goodRangeText: string;
  optimalRangeText: string;
  zoneFractions: {
    payAttention: number;
    fair: number;
    good: number;
    optimal: number;
  };
  currentMarkerPosition01: number;
  accessibilitySummary: string;
  testID?: string;
};

/** Presentation floor for label column flex only — does not alter marker position. */
const LABEL_FLEX_FLOOR = 0.14;

export function ReadinessContributorScoreBar({
  supportingLabel,
  payAttentionLabel,
  fairLabel,
  goodLabel,
  optimalLabel,
  payAttentionRangeText,
  fairRangeText,
  goodRangeText,
  optimalRangeText,
  zoneFractions,
  currentMarkerPosition01,
  accessibilitySummary,
  testID = "readiness-contributor-score-bar",
}: ReadinessContributorScoreBarProps): React.ReactElement {
  const markerLeft = Math.max(0, Math.min(1, currentMarkerPosition01));

  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.supportingLabel} testID={`${testID}-supporting-label`}>
        {supportingLabel}
      </Text>
      <View
        accessible
        accessibilityRole="summary"
        accessibilityLabel={accessibilitySummary}
        testID={`${testID}-bar`}
      >
        <View style={styles.labelRow} importantForAccessibility="no">
          <View
            style={[
              styles.labelCol,
              { flex: Math.max(zoneFractions.payAttention, LABEL_FLEX_FLOOR) },
            ]}
          >
            <Text style={styles.zoneTitle} numberOfLines={2}>
              {payAttentionLabel}
            </Text>
            <Text style={styles.zoneRange} numberOfLines={1}>
              {payAttentionRangeText}
            </Text>
          </View>
          <View
            style={[
              styles.labelCol,
              styles.labelColCenter,
              { flex: Math.max(zoneFractions.fair, LABEL_FLEX_FLOOR) },
            ]}
          >
            <Text style={[styles.zoneTitle, styles.zoneTitleCenter]} numberOfLines={1}>
              {fairLabel}
            </Text>
            <Text style={[styles.zoneRange, styles.zoneRangeCenter]} numberOfLines={1}>
              {fairRangeText}
            </Text>
          </View>
          <View
            style={[
              styles.labelCol,
              styles.labelColCenter,
              { flex: Math.max(zoneFractions.good, LABEL_FLEX_FLOOR) },
            ]}
          >
            <Text style={[styles.zoneTitle, styles.zoneTitleCenter]} numberOfLines={1}>
              {goodLabel}
            </Text>
            <Text style={[styles.zoneRange, styles.zoneRangeCenter]} numberOfLines={1}>
              {goodRangeText}
            </Text>
          </View>
          <View
            style={[
              styles.labelCol,
              styles.labelColEnd,
              { flex: Math.max(zoneFractions.optimal, LABEL_FLEX_FLOOR) },
            ]}
          >
            <Text style={[styles.zoneTitle, styles.zoneTitleEnd]} numberOfLines={1}>
              {optimalLabel}
            </Text>
            <Text style={[styles.zoneRange, styles.zoneRangeEnd]} numberOfLines={1}>
              {optimalRangeText}
            </Text>
          </View>
        </View>

        <View style={styles.track} importantForAccessibility="no">
          <View
            style={[
              styles.zone,
              {
                flex: Math.max(zoneFractions.payAttention, 0.001),
                backgroundColor: UI_READINESS_SCORE_PAY_ATTENTION_FILL,
              },
            ]}
            testID={`${testID}-pay-attention-zone`}
          />
          <View
            style={[
              styles.zone,
              {
                flex: Math.max(zoneFractions.fair, 0.001),
                backgroundColor: UI_READINESS_SCORE_FAIR_FILL,
              },
            ]}
            testID={`${testID}-fair-zone`}
          />
          <View
            style={[
              styles.zone,
              {
                flex: Math.max(zoneFractions.good, 0.001),
                backgroundColor: UI_READINESS_SCORE_GOOD_FILL,
              },
            ]}
            testID={`${testID}-good-zone`}
          />
          <View
            style={[
              styles.zone,
              styles.optimalZone,
              {
                flex: Math.max(zoneFractions.optimal, 0.001),
                backgroundColor: UI_READINESS_SCORE_OPTIMAL_FILL,
                borderColor: UI_READINESS_SCORE_OPTIMAL_BORDER,
              },
            ]}
            testID={`${testID}-optimal-zone`}
          />

          <View
            style={[styles.currentMarker, { left: `${markerLeft * 100}%` }]}
            testID={`${testID}-marker`}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginTop: 4,
  },
  supportingLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: UI_TEXT_SECONDARY,
  },
  labelRow: {
    flexDirection: "row",
    gap: 2,
  },
  labelCol: {
    minWidth: 0,
    gap: 2,
  },
  labelColCenter: {
    alignItems: "center",
  },
  labelColEnd: {
    alignItems: "flex-end",
  },
  zoneTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.15,
    textTransform: "uppercase",
    color: UI_TEXT_MUTED,
  },
  zoneTitleCenter: {
    textAlign: "center",
  },
  zoneTitleEnd: {
    textAlign: "right",
    color: UI_TEXT_PRIMARY,
  },
  zoneRange: {
    fontSize: 11,
    lineHeight: 14,
    color: UI_TEXT_SECONDARY,
    fontVariant: ["tabular-nums"],
  },
  zoneRangeCenter: {
    textAlign: "center",
  },
  zoneRangeEnd: {
    textAlign: "right",
  },
  track: {
    height: 16,
    borderRadius: 8,
    overflow: "visible",
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  zone: {
    height: "100%",
  },
  optimalZone: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    zIndex: 1,
  },
  currentMarker: {
    position: "absolute",
    top: -5,
    marginLeft: -2.5,
    width: 5,
    height: 26,
    borderRadius: 2.5,
    backgroundColor: UI_TEXT_PRIMARY,
    zIndex: 2,
  },
});
