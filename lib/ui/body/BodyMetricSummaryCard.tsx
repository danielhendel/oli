import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BodyMetricCardModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import type {
  BodyFatPrimaryView,
  LeanMassPrimaryView,
  WeightPrimaryView,
} from "@/lib/body/presentation/bodyMetricPrimaryViews";
import { BodyAppleHealthSourceIcon } from "@/lib/ui/body/BodyAppleHealthSourceIcon";
import { BodyCompositionShareChart } from "@/lib/ui/body/BodyCompositionShareChart";
import { BodyMetricClassificationChart } from "@/lib/ui/body/BodyMetricClassificationChart";
import { BodyMetricEducationalReferenceChart } from "@/lib/ui/body/BodyMetricEducationalReferenceChart";
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
  | "sync_off"
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
  /** User mass-unit preference (does not mutate from card toggles). */
  massDisplayUnit: BodyMassDisplayUnit;
  weightPrimaryView?: WeightPrimaryView;
  onChangeWeightPrimaryView?: (view: WeightPrimaryView) => void;
  bodyFatPrimaryView?: BodyFatPrimaryView;
  onChangeBodyFatPrimaryView?: (view: BodyFatPrimaryView) => void;
  leanMassPrimaryView?: LeanMassPrimaryView;
  onChangeLeanMassPrimaryView?: (view: LeanMassPrimaryView) => void;
};

function SegmentedViewControl<T extends string>(props: {
  options: readonly { readonly id: T; readonly label: string; readonly accessibilityLabel: string }[];
  selected: T;
  onChange: (next: T) => void;
  testID: string;
}) {
  return (
    <View style={styles.unitToggle} testID={props.testID} accessibilityRole="tablist">
      {props.options.map((option) => {
        const selected = props.selected === option.id;
        return (
          <Pressable
            key={option.id}
            style={[styles.unitToggleSeg, selected && styles.unitToggleSegActive]}
            onPress={(e) => {
              e.stopPropagation?.();
              if (!selected) props.onChange(option.id);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.accessibilityLabel}
            accessibilityHint={
              selected ? "Selected." : `Double tap to show ${option.label} view.`
            }
            testID={`${props.testID}-${option.id}`}
          >
            <Text style={[styles.unitToggleText, selected && styles.unitToggleTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function connectionAccessibility(
  kind: BodyMetricConnectionActionKind,
  metricTitle?: string,
): {
  label: string;
  hint: string;
} {
  const metric = metricTitle ?? "Body measurements";
  switch (kind) {
    case "connected":
      return {
        label: `Apple Health connected for ${metric}`,
        hint: "Double tap to view sync status",
      };
    case "sync_off":
      return {
        label: `Apple Health ${metric} sync is off`,
        hint: "Double tap to manage sync",
      };
    case "connected_attention":
      return {
        label: `Apple Health connected. ${metric} history import is incomplete`,
        hint: "Double tap to resume import",
      };
    case "review_access":
      return {
        label: `Apple Health ${metric} access may need attention`,
        hint: "Double tap to review",
      };
    case "syncing":
      return {
        label: `Connecting Apple Health for ${metric}`,
        hint: "Please wait",
      };
    case "importing":
      return {
        label: `Importing Apple Health ${metric} history`,
        hint: "Double tap to view progress",
      };
    case "resume":
      return {
        label: `Resume importing Apple Health ${metric} history`,
        hint: "Double tap to resume",
      };
    case "try_again":
      return {
        label: `Try again to connect Apple Health for ${metric}`,
        hint: "Double tap to retry",
      };
    case "sync_now":
    default:
      return {
        label: `Connect ${metric} to Apple Health`,
        hint: "Opens Apple Health connection setup",
      };
  }
}

/**
 * Premium Body metric card shell — value-first hierarchy with integrated chart region.
 * Weight uses BMI screening classification (marker stem without redundant value bubble).
 * Body Fat may use Gallagher educational ranges with a value-position indicator only.
 * Lean Mass uses composition-share with a quantity marker (no population ranges).
 */
export function BodyMetricSummaryCard(props: BodyMetricSummaryCardProps) {
  const { model } = props;
  const chart = model.classificationChart;
  const educational = model.educationalReferenceChart;
  const share = model.compositionShareGraph;
  const showChart = chart != null && chart.segments.length > 0;
  const showShare = !showChart && share != null;
  const showEducational =
    !showChart && !showShare && educational != null && educational.segments.length > 0;
  const showScaffold =
    !showChart && !showShare && !showEducational && model.showUnclassifiedScaffold;
  const valueText = model.displayValue ?? "—";
  const valueA11y =
    model.formattedValue != null ? model.formattedValue : "No current measurement";
  const connected =
    props.connectionAction.kind === "connected" ||
    props.connectionAction.kind === "connected_attention";
  const showPercentInValue = model.displayUnit === "%";
  const metricTitle =
    model.metric === "weight"
      ? "Weight"
      : model.metric === "bodyFat"
        ? "Body Fat"
        : model.metric === "leanTissue"
          ? "Lean Mass"
          : "Body measurements";
  const connectionA11y = connectionAccessibility(props.connectionAction.kind, metricTitle);
  const connectionColor =
    connected
      ? UI_DURATION_STATUS_RECOMMENDED_TEXT
      : props.connectionAction.kind === "sync_off"
        ? UI_TEXT_SECONDARY
        : props.connectionAction.kind === "syncing" ||
            props.connectionAction.kind === "importing"
          ? UI_TEXT_SECONDARY
          : props.connectionAction.kind === "review_access" ||
              props.connectionAction.kind === "try_again" ||
              props.connectionAction.kind === "resume"
            ? "#F5C26B"
            : BODY_INDIGO;

  const massLabel = props.massDisplayUnit;
  const massA11yUnit = massLabel === "lb" ? "pounds" : "kilograms";

  let viewToggle: React.ReactNode = null;
  if (model.metric === "weight" && props.onChangeWeightPrimaryView) {
    const selected = props.weightPrimaryView ?? "mass";
    viewToggle = (
      <SegmentedViewControl
        testID="body-metric-view-weight"
        selected={selected}
        onChange={props.onChangeWeightPrimaryView}
        options={[
          {
            id: "mass" as const,
            label: massLabel,
            accessibilityLabel: `Show Weight in ${massA11yUnit}`,
          },
          {
            id: "bmi" as const,
            label: "BMI",
            accessibilityLabel: "Show BMI",
          },
        ]}
      />
    );
  } else if (model.metric === "bodyFat" && props.onChangeBodyFatPrimaryView) {
    const selected = props.bodyFatPrimaryView ?? "percentage";
    viewToggle = (
      <SegmentedViewControl
        testID="body-metric-view-bodyFat"
        selected={selected}
        onChange={props.onChangeBodyFatPrimaryView}
        options={[
          {
            id: "percentage" as const,
            label: "%",
            accessibilityLabel: "Show Body Fat as percentage",
          },
          {
            id: "fatMass" as const,
            label: massLabel,
            accessibilityLabel: `Show Body Fat as fat mass in ${massA11yUnit}`,
          },
        ]}
      />
    );
  } else if (model.metric === "leanTissue" && props.onChangeLeanMassPrimaryView) {
    const selected = props.leanMassPrimaryView ?? "mass";
    viewToggle = (
      <SegmentedViewControl
        testID="body-metric-view-leanTissue"
        selected={selected}
        onChange={props.onChangeLeanMassPrimaryView}
        options={[
          {
            id: "percentage" as const,
            label: "%",
            accessibilityLabel: "Show Lean Mass as percentage",
          },
          {
            id: "mass" as const,
            label: massLabel,
            accessibilityLabel: `Show Lean Mass in ${massA11yUnit}`,
          },
        ]}
      />
    );
  }

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
          {viewToggle}
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
        {showChart && chart != null ? (
          <BodyMetricClassificationChart
            model={chart}
            testID={`body-metric-chart-${model.metric}`}
          />
        ) : null}

        {showShare && share != null ? (
          <BodyCompositionShareChart
            model={share}
            testID={`body-metric-share-${model.metric}`}
          />
        ) : null}

        {showEducational && educational != null ? (
          <BodyMetricEducationalReferenceChart
            model={educational}
            testID={`body-metric-educational-${model.metric}`}
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
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: UI_TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: "700",
  },
  recency: {
    color: UI_TEXT_MUTED,
    fontSize: 12,
    fontWeight: "500",
  },
  topTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unitToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(120,120,128,0.16)",
    borderRadius: 8,
    padding: 2,
    minHeight: 44,
    alignItems: "center",
  },
  unitToggleSeg: {
    minWidth: 40,
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  unitToggleSegActive: {
    backgroundColor: UI_CARD_SURFACE,
  },
  unitToggleText: {
    color: UI_TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: "600",
  },
  unitToggleTextActive: {
    color: UI_TEXT_PRIMARY,
  },
  chevron: {
    color: UI_TEXT_MUTED,
    fontSize: 22,
    fontWeight: "400",
    lineHeight: 24,
  },
  valueBlock: {
    marginTop: 8,
    marginBottom: 0,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  value: {
    color: UI_TEXT_PRIMARY,
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  missingValue: {
    color: UI_TEXT_MUTED,
  },
  valuePercent: {
    fontSize: 28,
    fontWeight: "600",
  },
  chartRegion: {
    marginTop: 4,
    marginBottom: 2,
  },
  actionBlock: {
    marginTop: 2,
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: UI_BORDER_HAIRLINE,
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 44,
  },
  addBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingRight: 8,
  },
  addBtnText: {
    color: BODY_INDIGO,
    fontSize: 14,
    fontWeight: "600",
  },
  connectionBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingLeft: 4,
  },
  connectionBtnConnected: {},
  connectionInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  connectionBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  connectionMuted: {
    color: UI_TEXT_SECONDARY,
  },
  connectionChevron: {
    color: UI_TEXT_MUTED,
    fontSize: 16,
  },
  attentionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F5C26B",
  },
});
