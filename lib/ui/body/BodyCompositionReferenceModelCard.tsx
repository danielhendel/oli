import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BodyCompositionEducationDimension } from "@/lib/body/education/bodyCompositionEducationTypes";
import { SYSTEM_ACCENT, SYSTEM_ACCENT_OVERLAY_10 } from "@/lib/ui/theme/systemAccent";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type BodyCompositionReferenceModelCardProps = {
  educationalReferenceLabel: string;
  independenceCopy: string;
  placementCopy: string;
  dimensions: readonly BodyCompositionEducationDimension[];
};

function EducationalRail({ dimension }: { dimension: BodyCompositionEducationDimension }) {
  return (
    <View
      style={styles.railBlock}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={dimension.accessibilitySummary}
    >
      <Text style={styles.railTitle} accessibilityRole="header">
        {dimension.title}
      </Text>
      <View style={styles.endpointRow}>
        <Text style={styles.endpointLeft}>{dimension.leftEndpointLabel}</Text>
        <Text style={styles.endpointRight}>{dimension.rightEndpointLabel}</Text>
      </View>
      <View style={styles.railTrack} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={styles.railFill} />
        <View style={styles.railSegment} />
        <View style={styles.railSegment} />
        <View style={styles.railSegment} />
      </View>
    </View>
  );
}

/**
 * Static two-dimension educational reference. Never shows a personal marker.
 */
export function BodyCompositionReferenceModelCard(props: BodyCompositionReferenceModelCardProps) {
  return (
    <View
      style={styles.card}
      testID="body-composition-reference-model"
      accessibilityLabel={`${props.educationalReferenceLabel}. ${props.independenceCopy} ${props.placementCopy}`}
    >
      <Text style={styles.badge} accessibilityRole="text">
        {props.educationalReferenceLabel}
      </Text>
      <Text style={styles.independence}>{props.independenceCopy}</Text>
      <Text style={styles.placement}>{props.placementCopy}</Text>
      {props.dimensions.map((dimension) => (
        <EducationalRail key={dimension.id} dimension={dimension} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#14161C",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    gap: 12,
  },
  badge: {
    alignSelf: "flex-start",
    color: SYSTEM_ACCENT,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  independence: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  placement: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
  railBlock: {
    gap: 8,
    marginTop: 4,
  },
  railTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "700",
  },
  endpointRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  endpointLeft: {
    flexShrink: 1,
    color: UI_TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
  },
  endpointRight: {
    flexShrink: 1,
    color: UI_TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "right",
  },
  railTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: SYSTEM_ACCENT_OVERLAY_10,
    overflow: "hidden",
    flexDirection: "row",
  },
  railFill: {
    flex: 1,
    backgroundColor: "rgba(58,91,219,0.35)",
  },
  railSegment: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
});
