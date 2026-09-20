import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyMetricEducationalReferencePresentationModel } from "@/lib/body/standards/educationalReferenceTypes";
import {
  BODY_METRIC_CHART_TRACK_BORDER,
  BODY_METRIC_CHART_TRACK_SHADOW,
  BODY_METRIC_CHART_TRACK_SHEEN,
  BODY_METRIC_SPECTRUM_HEIGHT,
  BODY_METRIC_SPECTRUM_RADIUS,
  resolveBodyMetricClassificationBandChrome,
} from "@/lib/ui/theme/bodyMetricClassificationChrome";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type BodyMetricEducationalReferenceChartProps = {
  model: BodyMetricEducationalReferencePresentationModel;
  testID?: string;
};

/**
 * Stage 3C educational reference graph.
 * Renders construct, qualitative ranges, population/method, evidence, and withhold reasons.
 * Never places a personal marker.
 */
export function BodyMetricEducationalReferenceChart(
  props: BodyMetricEducationalReferenceChartProps,
) {
  const { model } = props;
  const [expanded, setExpanded] = useState(false);
  const segmentCount = model.segments.length;

  if (segmentCount < 2 || model.personalMarker != null) {
    return (
      <View
        testID={props.testID ?? "body-metric-educational-reference-chart"}
        accessibilityLabel="Educational reference unavailable"
        style={styles.failClosed}
      />
    );
  }

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={model.accessibleSummary}
      testID={props.testID ?? "body-metric-educational-reference-chart"}
      style={styles.wrap}
    >
      <Text style={styles.badge} accessibilityRole="text">
        {model.badgeLabel}
      </Text>
      <Text style={styles.constructTitle}>{model.constructLabel}</Text>
      <Text style={styles.constructBody}>{model.constructDescription}</Text>

      <View
        style={styles.trackGlow}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        testID="body-metric-educational-spectrum"
      >
        <View style={styles.track}>
          {model.segments.map((segment, index) => {
            const chrome = resolveBodyMetricClassificationBandChrome(segment.tone);
            const isFirst = index === 0;
            const isLast = index === segmentCount - 1;
            return (
              <View
                key={segment.id}
                style={[
                  styles.band,
                  {
                    backgroundColor: chrome.fill,
                    borderTopLeftRadius: isFirst ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                    borderBottomLeftRadius: isFirst ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                    borderTopRightRadius: isLast ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                    borderBottomRightRadius: isLast ? BODY_METRIC_SPECTRUM_RADIUS : 0,
                  },
                ]}
              >
                <View style={[styles.bandSheen, { backgroundColor: chrome.fillHighlight }]} />
              </View>
            );
          })}
          <View pointerEvents="none" style={styles.trackSheen} />
        </View>
      </View>

      <View style={styles.labelRow} importantForAccessibility="no">
        {model.segments.map((segment) => (
          <Text key={segment.id} style={styles.segmentLabel} numberOfLines={2}>
            {segment.displayLabel}
          </Text>
        ))}
      </View>

      <Text style={styles.rangeMeaning}>{model.rangeMeaningSummary}</Text>

      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded
            ? "Hide population, method, evidence, and placement details"
            : "Show population, method, evidence, and placement details"
        }
        testID="body-metric-educational-disclosure"
        style={styles.disclosureBtn}
      >
        <Text style={styles.disclosureLabel}>
          {expanded ? "Hide details" : "Population, method, and evidence"}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={styles.disclosureBody} testID="body-metric-educational-disclosure-body">
          <Text style={styles.disclosureHeading}>Population</Text>
          <Text style={styles.disclosureText}>{model.applicablePopulation}</Text>
          <Text style={styles.disclosureHeading}>Methods</Text>
          <Text style={styles.disclosureText}>{model.applicableMethodsSummary}</Text>
          <Text style={styles.disclosureHeading}>Evidence Oli currently has</Text>
          <Text style={styles.disclosureText}>{model.evidence.evidenceSummary}</Text>
          <Text style={styles.disclosureHeading}>Why personal placement is withheld</Text>
          {model.personalPlacementWithheldReasons.map((reason) => (
            <Text key={reason} style={styles.disclosureText}>
              • {reason}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  failClosed: {
    height: BODY_METRIC_SPECTRUM_HEIGHT,
  },
  badge: {
    alignSelf: "flex-start",
    color: SYSTEM_ACCENT,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  constructTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "700",
  },
  constructBody: {
    color: UI_TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
  },
  trackGlow: {
    borderRadius: BODY_METRIC_SPECTRUM_RADIUS,
    shadowColor: BODY_METRIC_CHART_TRACK_SHADOW,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginTop: 4,
  },
  track: {
    flexDirection: "row",
    height: BODY_METRIC_SPECTRUM_HEIGHT,
    borderRadius: BODY_METRIC_SPECTRUM_RADIUS,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BODY_METRIC_CHART_TRACK_BORDER,
  },
  band: {
    flex: 1,
    height: "100%",
    overflow: "hidden",
  },
  bandSheen: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "48%",
    opacity: 0.55,
  },
  trackSheen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BODY_METRIC_CHART_TRACK_SHEEN,
    opacity: 0.12,
  },
  labelRow: {
    flexDirection: "row",
    gap: 4,
  },
  segmentLabel: {
    flex: 1,
    color: UI_TEXT_MUTED,
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
  },
  rangeMeaning: {
    color: UI_TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 17,
  },
  disclosureBtn: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  disclosureLabel: {
    color: SYSTEM_ACCENT,
    fontSize: 13,
    fontWeight: "600",
  },
  disclosureBody: {
    gap: 6,
    paddingTop: 2,
  },
  disclosureHeading: {
    color: UI_TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  disclosureText: {
    color: UI_TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 17,
  },
});
