import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyMetricCardModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import { BodyMetricClassificationChart } from "@/lib/ui/body/BodyMetricClassificationChart";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import {
  UI_CARD_ELEVATED_BORDER,
  UI_CARD_SURFACE,
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_MUTED,
  UI_TEXT_PRIMARY,
  UI_TEXT_SECONDARY,
} from "@/lib/ui/theme/uiTokens";

export type BodyMetricConnectionActionKind =
  | "sync_now"
  | "connected"
  | "syncing"
  | "review_access"
  | "try_again";

export type BodyMetricSummaryCardProps = {
  model: BodyMetricCardModel;
  onPress: () => void;
  onPressAddMeasurement: () => void;
  connectionAction: {
    kind: BodyMetricConnectionActionKind;
    label: string;
  };
  onPressConnectionAction: () => void;
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

/**
 * Shared Body metric card shell.
 * Weight may include an approved classification chart; Body Fat / Lean do not invent one.
 */
export function BodyMetricSummaryCard(props: BodyMetricSummaryCardProps) {
  const { model } = props;
  const provenance = provenanceLine(model);
  const chart = model.classificationChart;
  const showChart = chart != null && chart.segments.length > 0;
  const valueText = model.formattedValue ?? "—";
  const valueA11y =
    model.formattedValue != null ? model.formattedValue : "No current measurement";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        model.featured && styles.cardFeatured,
        pressed && styles.pressed,
      ]}
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={model.accessibilityLabel}
      accessibilityHint="Opens metric details"
      testID={`body-metric-card-${model.metric}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{model.title}</Text>
        <View style={styles.valueCluster}>
          <Text
            style={[styles.value, model.formattedValue == null && styles.missingValue]}
            testID={`body-metric-value-${model.metric}`}
            accessibilityLabel={valueA11y}
          >
            {valueText}
          </Text>
          <Text style={styles.chevron} accessibilityElementsHidden>
            ›
          </Text>
        </View>
      </View>

      {provenance ? (
        <Text style={styles.provenance} testID={`body-metric-provenance-${model.metric}`}>
          {provenance}
        </Text>
      ) : null}

      {showChart ? (
        <BodyMetricClassificationChart
          model={chart!}
          testID={`body-metric-chart-${model.metric}`}
        />
      ) : null}

      <View style={styles.actionRow} testID={`body-metric-actions-${model.metric}`}>
        <Pressable
          style={styles.addBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            props.onPressAddMeasurement();
          }}
          accessibilityRole="button"
          accessibilityLabel="Add measurement"
          accessibilityHint="Opens manual measurement entry"
          testID={`body-metric-add-${model.metric}`}
        >
          <Text style={styles.addBtnText}>Add measurement</Text>
        </Pressable>
        <Pressable
          style={styles.connectionBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            props.onPressConnectionAction();
          }}
          accessibilityRole="button"
          accessibilityLabel={props.connectionAction.label}
          testID={`body-metric-connection-${model.metric}`}
        >
          <Text
            style={[
              styles.connectionBtnText,
              (props.connectionAction.kind === "connected" ||
                props.connectionAction.kind === "syncing") &&
                styles.connectionMuted,
            ]}
          >
            {props.connectionAction.label}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    minHeight: 44,
  },
  cardFeatured: {
    paddingVertical: 18,
    gap: 10,
  },
  pressed: {
    opacity: 0.92,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: "700",
    flexShrink: 1,
  },
  valueCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  value: {
    color: UI_TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  missingValue: {
    color: UI_TEXT_MUTED,
    fontWeight: "600",
  },
  chevron: {
    color: BODY_INDIGO,
    fontSize: 22,
    fontWeight: "300",
    marginTop: -1,
  },
  provenance: {
    color: UI_TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
    marginTop: -2,
  },
  actionRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  addBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingRight: 8,
  },
  addBtnText: {
    color: BODY_INDIGO,
    fontSize: 15,
    fontWeight: "600",
  },
  connectionBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingLeft: 8,
  },
  connectionBtnText: {
    color: BODY_INDIGO,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "right",
  },
  connectionMuted: {
    color: UI_TEXT_SECONDARY,
  },
});
