import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { BodyCompositionEvidenceTier } from "@/lib/body/education/bodyCompositionEducationTypes";
import {
  UI_CARD_ELEVATED_BORDER,
  UI_CARD_SURFACE,
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type BodyCompositionEvidenceTiersProps = {
  title: string;
  tiers: readonly BodyCompositionEvidenceTier[];
};

export function BodyCompositionEvidenceTiers(props: BodyCompositionEvidenceTiersProps) {
  return (
    <View style={styles.section} testID="body-composition-evidence-tiers">
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {props.title}
      </Text>
      {props.tiers.map((tier) => (
        <View
          key={tier.id}
          style={styles.card}
          accessible
          accessibilityLabel={`${tier.title}. ${tier.description}`}
          testID={`body-composition-evidence-tier-${tier.id}`}
        >
          <Text style={styles.tierTitle}>{tier.title}</Text>
          <Text style={styles.description}>{tier.description}</Text>
          <Text style={styles.evidenceLabel}>Potential evidence</Text>
          {tier.potentialEvidence.map((item) => (
            <Text key={item} style={styles.evidenceItem}>
              · {item}
            </Text>
          ))}
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
    gap: 6,
  },
  tierTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "700",
  },
  description: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
  evidenceLabel: {
    marginTop: 4,
    color: UI_TEXT_MUTED,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  evidenceItem: {
    color: UI_TEXT_PRIMARY,
    fontSize: 14,
    lineHeight: 20,
  },
});
