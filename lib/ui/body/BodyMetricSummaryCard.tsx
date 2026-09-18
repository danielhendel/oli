import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyMetricCardModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import { BodyMetricReferenceBar } from "@/lib/ui/body/BodyMetricReferenceBar";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import {
  UI_CARD_ELEVATED_BORDER,
  UI_CARD_SURFACE,
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type BodyMetricSummaryCardProps = {
  model: BodyMetricCardModel;
  onPress: () => void;
  onPressAddMeasurement?: (() => void) | undefined;
};

function provenanceLine(model: BodyMetricCardModel): string | null {
  const parts: string[] = [];
  if (model.provenance.measurementMethodLabel) {
    parts.push(model.provenance.measurementMethodLabel);
  }
  if (model.provenance.transportLabel) {
    parts.push(model.provenance.transportLabel);
  }
  if (model.provenance.sourceApplicationLabel) {
    parts.push(model.provenance.sourceApplicationLabel);
  }
  if (model.provenance.measuredAtLabel) {
    parts.push(model.provenance.measuredAtLabel);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function BodyMetricSummaryCard(props: BodyMetricSummaryCardProps) {
  const { model } = props;
  const provenance = provenanceLine(model);
  const showAdd =
    model.readiness === "missing" && typeof props.onPressAddMeasurement === "function";

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={model.accessibilityLabel}
      accessibilityHint="Opens metric details"
      testID={`body-metric-card-${model.metric}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{model.title}</Text>
        <Text style={styles.chevron} accessibilityElementsHidden>
          ›
        </Text>
      </View>

      {model.formattedValue != null ? (
        <Text style={styles.value} testID={`body-metric-value-${model.metric}`}>
          {model.formattedValue}
        </Text>
      ) : (
        <Text style={styles.missingValue} testID={`body-metric-value-${model.metric}`}>
          {model.statusLabel === "No measurement yet" ? "—" : model.statusLabel}
        </Text>
      )}

      <Text style={styles.status}>{model.statusLabel}</Text>

      {model.referenceContextLabel ? (
        <Text style={styles.context}>{model.referenceContextLabel}</Text>
      ) : null}

      {model.referenceLabel ? <Text style={styles.reference}>{model.referenceLabel}</Text> : null}

      {model.referenceBar ? (
        <BodyMetricReferenceBar
          model={model.referenceBar}
          testID={`body-metric-bar-${model.metric}`}
        />
      ) : null}

      {provenance ? <Text style={styles.provenance}>{provenance}</Text> : null}

      {showAdd ? (
        <Pressable
          style={styles.addBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            props.onPressAddMeasurement?.();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Add measurement for ${model.title}`}
          testID={`body-metric-add-${model.metric}`}
        >
          <Text style={styles.addBtnText}>Add measurement</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    padding: 16,
    gap: 6,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.92,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "700",
  },
  chevron: {
    color: BODY_INDIGO,
    fontSize: 22,
    fontWeight: "300",
  },
  value: {
    color: UI_TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  missingValue: {
    color: UI_TEXT_MUTED,
    fontSize: 28,
    fontWeight: "600",
  },
  status: {
    color: UI_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 19,
  },
  context: {
    color: UI_TEXT_MUTED,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  reference: {
    color: UI_TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
  },
  provenance: {
    marginTop: 2,
    color: UI_TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
  },
  addBtn: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    marginTop: 4,
  },
  addBtnText: {
    color: BODY_INDIGO,
    fontSize: 15,
    fontWeight: "600",
  },
});
