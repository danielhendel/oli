import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyMetricCardModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import { BodyAppleHealthSourceIcon } from "@/lib/ui/body/BodyAppleHealthSourceIcon";
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
  | "connected_attention"
  | "syncing"
  | "importing"
  | "review_access"
  | "try_again"
  | "resume";

export type BodyMassDisplayUnit = "lb" | "kg";

export type BodyMetricSummaryCardProps = {
  model: BodyMetricCardModel;
  onPress: () => void;
  onPressAddMeasurement: () => void;
  connectionAction: {
    kind: BodyMetricConnectionActionKind;
    label: string;
  };
  onPressConnectionAction: () => void;
  /** Shared Body mass display unit (Weight + Lean Tissue). */
  massDisplayUnit: BodyMassDisplayUnit;
  onChangeMassDisplayUnit: (unit: BodyMassDisplayUnit) => void;
};

function MassUnitSegmentedControl(props: {
  unit: BodyMassDisplayUnit;
  onChange: (unit: BodyMassDisplayUnit) => void;
}) {
  return (
    <View
      style={styles.unitToggle}
      testID="body-metric-unit-pill"
      accessibilityRole="tablist"
    >
      {(["lb", "kg"] as const).map((option) => {
        const selected = props.unit === option;
        const label = option === "lb" ? "Pounds" : "Kilograms";
        return (
          <Pressable
            key={option}
            style={[styles.unitToggleSeg, selected && styles.unitToggleSegActive]}
            onPress={(e) => {
              e.stopPropagation?.();
              if (!selected) props.onChange(option);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            accessibilityHint={
              selected
                ? `Selected. Body mass values are shown in ${option}.`
                : `Double tap to display Body mass values in ${option}.`
            }
            testID={`body-metric-unit-${option}`}
          >
            <Text
              style={[styles.unitToggleText, selected && styles.unitToggleTextActive]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function connectionAccessibility(kind: BodyMetricConnectionActionKind): {
  label: string;
  hint: string;
} {
  switch (kind) {
    case "connected":
      return {
        label: "Apple Health connected for Body measurements",
        hint: "Double tap to view sync status",
      };
    case "connected_attention":
      return {
        label: "Apple Health connected. Body history import is incomplete",
        hint: "Double tap to resume import",
      };
    case "review_access":
      return {
        label: "Apple Health Body access may need attention",
        hint: "Double tap to review",
      };
    case "syncing":
      return {
        label: "Connecting Apple Health for Body measurements",
        hint: "Please wait",
      };
    case "importing":
      return {
        label: "Importing Apple Health Body history",
        hint: "Double tap to view progress",
      };
    case "resume":
      return {
        label: "Resume importing Apple Health Body history",
        hint: "Double tap to resume",
      };
    case "try_again":
      return {
        label: "Try again to connect Apple Health for Body measurements",
        hint: "Double tap to retry",
      };
    case "sync_now":
    default:
      return {
        label: "Sync Body measurements with Apple Health",
        hint: "Opens Apple Health connection setup",
      };
  }
}

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
  const connected =
    props.connectionAction.kind === "connected" ||
    props.connectionAction.kind === "connected_attention";
  const isMassMetric = model.metric === "weight" || model.metric === "leanTissue";
  const showPercentInValue = model.displayUnit === "%";
  const connectionA11y = connectionAccessibility(props.connectionAction.kind);
  const connectionColor =
    connected
      ? UI_DURATION_STATUS_RECOMMENDED_TEXT
      : props.connectionAction.kind === "syncing" ||
          props.connectionAction.kind === "importing"
        ? UI_TEXT_SECONDARY
        : props.connectionAction.kind === "review_access" ||
            props.connectionAction.kind === "try_again" ||
            props.connectionAction.kind === "resume"
          ? "#F5C26B"
          : BODY_INDIGO;

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
        <View style={styles.topTrailing}>
          {isMassMetric ? (
            <MassUnitSegmentedControl
              unit={props.massDisplayUnit}
              onChange={props.onChangeMassDisplayUnit}
            />
          ) : model.displayUnit === "%" ? (
            <View style={styles.unitPill} accessibilityElementsHidden testID="body-metric-unit-pill">
              <Text style={styles.unitPillText}>%</Text>
            </View>
          ) : null}
          <Text
            style={styles.chevron}
            accessibilityElementsHidden
            testID={`body-metric-chevron-${model.metric}`}
          >
            ›
          </Text>
        </View>
      </View>

      <View style={styles.valueBlock}>
        <View style={styles.valueRow}>
          <Text
            style={[styles.value, model.displayValue == null && styles.missingValue]}
            testID={`body-metric-value-${model.metric}`}
            accessibilityLabel={valueA11y}
          >
            {valueText}
            {showPercentInValue && model.displayValue != null ? (
              <Text style={styles.valuePercent}>%</Text>
            ) : null}
          </Text>
        </View>
      </View>

      <View style={styles.chartRegion}>
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
      </View>

      <View style={styles.actionBlock}>
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
            <Text style={styles.addBtnText}>Add measurement</Text>
          </Pressable>
          <Pressable
            style={[styles.connectionBtn, connected && styles.connectionBtnConnected]}
            onPress={(e) => {
              e.stopPropagation?.();
              if (props.connectionAction.kind === "syncing") return;
              props.onPressConnectionAction();
            }}
            disabled={props.connectionAction.kind === "syncing"}
            accessibilityRole="button"
            accessibilityLabel={connectionA11y.label}
            accessibilityHint={connectionA11y.hint}
            testID={`body-metric-connection-${model.metric}`}
          >
            <View style={styles.connectionInner}>
              <BodyAppleHealthSourceIcon accent="muted" size={18} decorative />
              <Text
                style={[
                  styles.connectionBtnText,
                  { color: connectionColor },
                  props.connectionAction.kind === "syncing" ||
                    props.connectionAction.kind === "importing"
                    ? styles.connectionMuted
                    : null,
                ]}
              >
                {props.connectionAction.label}
              </Text>
              {props.connectionAction.kind === "connected_attention" ? (
                <View
                  style={styles.attentionDot}
                  accessibilityElementsHidden
                  testID={`body-metric-connection-attention-${model.metric}`}
                />
              ) : null}
              {connected ? (
                <Text style={styles.connectionChevron} accessibilityElementsHidden>
                  ›
                </Text>
              ) : null}
            </View>
          </Pressable>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    gap: 0,
    minHeight: 44,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  pressed: {
    opacity: 0.94,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    paddingTop: 1,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.25,
  },
  recency: {
    color: UI_TEXT_MUTED,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "500",
  },
  topTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  unitToggle: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 3,
    minHeight: 44,
  },
  unitToggleSeg: {
    minWidth: 36,
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  unitToggleSegActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  unitToggleText: {
    color: UI_TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  unitToggleTextActive: {
    color: UI_TEXT_PRIMARY,
  },
  unitPill: {
    minHeight: 30,
    minWidth: 34,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  unitPillText: {
    color: UI_TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.25,
  },
  chevron: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 26,
    fontWeight: "300",
    lineHeight: 28,
    marginTop: -1,
  },
  valueBlock: {
    marginBottom: 18,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  value: {
    color: UI_TEXT_PRIMARY,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1.4,
    fontVariant: ["tabular-nums"],
  },
  valuePercent: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: UI_TEXT_SECONDARY,
  },
  missingValue: {
    color: UI_TEXT_MUTED,
    fontWeight: "600",
  },
  chartRegion: {
    marginBottom: 16,
  },
  actionBlock: {
    marginTop: 2,
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_HAIRLINE,
    marginBottom: 2,
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
    // Compact status — visual height ~28–32 via padding; hit target remains 44 via minHeight.
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  connectionInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  connectionBtnText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "right",
  },
  connectionChevron: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 18,
    fontWeight: "300",
    marginLeft: 1,
    marginTop: -1,
  },
  attentionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F5C26B",
    marginLeft: 1,
  },
  connectionMuted: {
    color: UI_TEXT_SECONDARY,
  },
});
