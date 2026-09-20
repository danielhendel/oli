import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyMetricEducationalReferencePresentationModel } from "@/lib/body/standards/educationalReferenceTypes";
import { BodyMetricEducationalReferenceChart } from "@/lib/ui/body/BodyMetricEducationalReferenceChart";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { UI_CARD_SURFACE, UI_TEXT_MUTED, UI_TEXT_PRIMARY, UI_TEXT_SECONDARY } from "@/lib/ui/theme/uiTokens";

export type BodyMetricDetailEducationPanelProps = {
  model: BodyMetricEducationalReferencePresentationModel | null;
  /** Extra static bullets shown when the educational model is present. */
  extraLimitations?: readonly string[];
  testID?: string;
};

/**
 * Metric-detail education block. Landing cards stay value-first; detail holds complexity.
 */
export function BodyMetricDetailEducationPanel(props: BodyMetricDetailEducationPanelProps) {
  const { model } = props;
  const [showLimitations, setShowLimitations] = useState(false);

  if (model == null) {
    return (
      <View style={styles.card} testID={props.testID ?? "body-metric-detail-education"}>
        <Text style={styles.title}>Education</Text>
        <Text style={styles.body}>
          Reference education is unavailable for this metric until an approved standard is ready.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap} testID={props.testID ?? "body-metric-detail-education"}>
      <BodyMetricEducationalReferenceChart
        model={model}
        testID="body-metric-detail-educational-chart"
      />

      {props.extraLimitations != null && props.extraLimitations.length > 0 ? (
        <View style={styles.card}>
          <Pressable
            onPress={() => setShowLimitations((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showLimitations }}
            accessibilityLabel={
              showLimitations ? "Hide additional limitations" : "Show additional limitations"
            }
            style={styles.disclosureBtn}
            testID="body-metric-detail-extra-limitations"
          >
            <Text style={styles.disclosureLabel}>
              {showLimitations ? "Hide additional limitations" : "Additional limitations"}
            </Text>
          </Pressable>
          {showLimitations
            ? props.extraLimitations.map((line) => (
                <Text key={line} style={styles.bullet}>
                  • {line}
                </Text>
              ))
            : null}
        </View>
      ) : null}

      <Text style={styles.footnote} accessibilityRole="text">
        Educational context only. Oli is not placing you personally on this continuum from this
        screen alone.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: "700",
  },
  body: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
  },
  disclosureBtn: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
  },
  disclosureLabel: {
    color: SYSTEM_ACCENT,
    fontSize: 14,
    fontWeight: "600",
  },
  bullet: {
    color: UI_TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
  },
  footnote: {
    color: UI_TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
  },
});
