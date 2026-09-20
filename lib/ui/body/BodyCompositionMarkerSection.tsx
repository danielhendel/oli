import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BodyCompositionEducationMarker } from "@/lib/body/education/bodyCompositionEducationTypes";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import {
  UI_CARD_ELEVATED_BORDER,
  UI_CARD_SURFACE,
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type BodyCompositionMarkerSectionProps = {
  title: string;
  markers: readonly BodyCompositionEducationMarker[];
};

export function BodyCompositionMarkerSection(props: BodyCompositionMarkerSectionProps) {
  return (
    <View style={styles.section} testID="body-composition-marker-section">
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {props.title}
      </Text>
      {props.markers.map((marker) => (
        <View
          key={marker.id}
          style={styles.card}
          accessible
          accessibilityLabel={marker.accessibilityLabel}
          testID={`body-composition-marker-${marker.id}`}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.markerTitle}>{marker.title}</Text>
            <Text style={styles.tierBadge}>{marker.evidenceTierLabel}</Text>
          </View>
          <Text style={styles.meaning}>{marker.meaning}</Text>
          <Text style={styles.why}>{marker.whyItMatters}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "700",
  },
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  markerTitle: {
    flexShrink: 1,
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "700",
  },
  tierBadge: {
    color: SYSTEM_ACCENT,
    fontSize: 12,
    fontWeight: "700",
  },
  meaning: {
    color: UI_TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 21,
  },
  why: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
});
