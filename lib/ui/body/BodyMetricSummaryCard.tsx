import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyMetricCardModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import { BodyMetricClassificationChart } from "@/lib/ui/body/BodyMetricClassificationChart";
import { BodyMetricUnclassifiedScaffold } from "@/lib/ui/body/BodyMetricUnclassifiedScaffold";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import {
  UI_BORDER_HAIRLINE,
  UI_CARD_ELEVATED_BORDER,
  UI_CARD_SURFACE,
  UI_DASH_CATEGORY_CARD_RADIUS,
  UI_DURATION_STATUS_RECOMMENDED_TEXT,
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

/**
 * Premium Body metric card shell — value-first hierarchy with integrated chart region.
 * Weight may include an approved classification chart; Body Fat / Lean use unclassified scaffolds.
 */
export function BodyMetricSummaryCard(props: BodyMetricSummaryCardProps) {
  const { model } = props;
  const chart = model.classificationChart;
  const showChart = chart != null && chart.segments.length > 0;
  const showScaffold = !showChart && model.showUnclassifiedScaffold;
  const valueText = model.displayValue ?? "—";
  const valueA11y =
    model.formattedValue != null ? model.formattedValue : "No current measurement";
  const connected = props.connectionAction.kind === "connected";

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={model.accessibilityLabel}
      accessibilityHint="Opens metric details"
      testID={`body-metric-card-${model.metric}`}
    >
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{model.title}</Text>
          {model.recencyLabel ? (
            <Text style={styles.recency} testID={`body-metric-recency-${model.metric}`}>
              {model.recencyLabel}
            </Text>
          ) : null}
        </View>
        {model.displayUnit ? (
          <View style={styles.unitChip} accessibilityElementsHidden>
            <Text style={styles.unitChipText}>{model.displayUnit}</Text>
          </View>
        ) : (
          <Text style={styles.chevron} accessibilityElementsHidden>
            ›
          </Text>
        )}
      </View>

      <View style={styles.valueRow}>
        <Text
          style={[styles.value, model.displayValue == null && styles.missingValue]}
          testID={`body-metric-value-${model.metric}`}
          accessibilityLabel={valueA11y}
        >
          {valueText}
        </Text>
        {model.displayUnit && model.displayValue != null ? (
          <Text style={styles.valueUnit} accessibilityElementsHidden>
            {model.displayUnit}
          </Text>
        ) : null}
      </View>

      {showChart ? (
        <BodyMetricClassificationChart
          model={chart!}
          testID={`body-metric-chart-${model.metric}`}
        />
      ) : null}

      {showScaffold ? (
        <BodyMetricUnclassifiedScaffold
          accessibilityLabel={
            model.unclassifiedScaffoldAccessibilityLabel ??
            `${model.title}. No approved classification.`
          }
          testID={`body-metric-scaffold-${model.metric}`}
        />
      ) : null}

      <View style={styles.actionDivider} />

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
          <Text style={styles.addBtnText}>＋  Add measurement</Text>
        </Pressable>
        <Pressable
          style={[styles.connectionBtn, connected && styles.connectionBtnConnected]}
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
              connected && styles.connectionConnectedText,
              props.connectionAction.kind === "syncing" && styles.connectionMuted,
            ]}
          >
            {connected ? "●  Connected" : props.connectionAction.label}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: UI_DASH_CATEGORY_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
    gap: 12,
    minHeight: 44,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  pressed: {
    opacity: 0.94,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  recency: {
    color: UI_TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  unitChip: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_BORDER_HAIRLINE,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  unitChipText: {
    color: UI_TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  chevron: {
    color: BODY_INDIGO,
    fontSize: 22,
    fontWeight: "300",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: -2,
  },
  value: {
    color: UI_TEXT_PRIMARY,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1.2,
    fontVariant: ["tabular-nums"],
  },
  missingValue: {
    color: UI_TEXT_MUTED,
    fontWeight: "600",
  },
  valueUnit: {
    color: UI_TEXT_SECONDARY,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_HAIRLINE,
    marginTop: 2,
  },
  actionRow: {
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
    paddingHorizontal: 4,
  },
  connectionBtnConnected: {
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(52, 211, 153, 0.12)",
  },
  connectionBtnText: {
    color: BODY_INDIGO,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "right",
  },
  connectionConnectedText: {
    color: UI_DURATION_STATUS_RECOMMENDED_TEXT,
  },
  connectionMuted: {
    color: UI_TEXT_SECONDARY,
  },
});
