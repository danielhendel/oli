import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BODY_COMPOSITION_SUMMARY_COPY } from "@/lib/body/presentation/buildBodyMetricSummaryCards";
import type { BodyMetricCardModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import { BODY_METRIC_RANGES_EXPLAINER_HREF } from "@/lib/data/body/bodyCompositionMetricRoutes";
import {
  BodyMetricSummaryCard,
  type BodyMassDisplayUnit,
  type BodyMetricConnectionActionKind,
} from "@/lib/ui/body/BodyMetricSummaryCard";
import { BODY_INDIGO } from "@/lib/ui/body/BodyDayRing";
import {
  UI_CARD_ELEVATED_BORDER,
  UI_CARD_SURFACE,
  UI_GROUPED_CARD_RADIUS,
  UI_TEXT_PRIMARY,
} from "@/lib/ui/theme/uiTokens";

export type BodyCompositionConnectionAction = {
  kind: BodyMetricConnectionActionKind;
  label: string;
};

export type BodyCompositionSummaryScreenProps = {
  cards: readonly BodyMetricCardModel[];
  appleHealthSlot: React.ReactNode;
  /** @deprecated Prefer connectionActionForMetric for metric-specific status. */
  connectionAction?: BodyCompositionConnectionAction;
  connectionActionForMetric?: (
    metric: BodyMetricCardModel["metric"],
  ) => BodyCompositionConnectionAction;
  onPressCard: (href: string) => void;
  onPressAddWeight: () => void;
  onPressConnectionAction?: () => void;
  onPressConnectionActionForMetric?: (metric: BodyMetricCardModel["metric"]) => void;
  onPressHref: (href: string) => void;
  /** Shared Body mass display unit (Weight + Lean Tissue). */
  massDisplayUnit: BodyMassDisplayUnit;
  onChangeMassDisplayUnit: (unit: BodyMassDisplayUnit) => void;
  /** Optional inline measurement error (cards remain visible). */
  measurementErrorSlot?: React.ReactNode;
  /** When false, hide the secondary Add/connect block (e.g. already connected). */
  showActionsSection?: boolean;
};

/**
 * Stage 3B landing: three metric cards first; compact actions when still useful.
 * Weight may include BMI screening chart; Body Fat and Lean Tissue do not.
 */
export function BodyCompositionSummaryScreen(props: BodyCompositionSummaryScreenProps) {
  const copy = BODY_COMPOSITION_SUMMARY_COPY;
  const ordered = props.cards;
  const showActions = props.showActionsSection !== false;

  return (
    <View style={styles.root} testID="body-composition-summary-screen">
      {props.measurementErrorSlot}

      <View style={styles.cards} testID="body-composition-metric-cards">
        {ordered.map((card) => {
          const connectionAction =
            props.connectionActionForMetric?.(card.metric) ??
            props.connectionAction ?? { kind: "sync_now" as const, label: "Sync now" };
          return (
            <BodyMetricSummaryCard
              key={card.metric}
              model={card}
              onPress={() => props.onPressCard(card.detailHref)}
              onPressAddMeasurement={props.onPressAddWeight}
              connectionAction={connectionAction}
              onPressConnectionAction={() => {
                if (props.onPressConnectionActionForMetric) {
                  props.onPressConnectionActionForMetric(card.metric);
                  return;
                }
                props.onPressConnectionAction?.();
              }}
              massDisplayUnit={props.massDisplayUnit}
              onChangeMassDisplayUnit={props.onChangeMassDisplayUnit}
            />
          );
        })}
      </View>

      {showActions ? (
        <View style={styles.actions} testID="body-composition-actions">
          <Text style={styles.actionsTitle} accessibilityRole="header">
            {copy.actionsTitle}
          </Text>

          <View style={styles.appleHealthSlot} testID="body-composition-baseline-apple-health">
            {props.appleHealthSlot}
          </View>

          <Pressable
            style={styles.linkRow}
            onPress={() => props.onPressHref(copy.historyHref)}
            accessibilityRole="button"
            accessibilityLabel={copy.historyLabel}
            testID="body-composition-view-history"
          >
            <Text style={styles.linkText}>{copy.historyLabel}</Text>
          </Pressable>

          <Pressable
            style={styles.linkRow}
            onPress={() => props.onPressHref(copy.settingsHref)}
            accessibilityRole="button"
            accessibilityLabel={copy.settingsLabel}
            testID="body-composition-view-settings"
          >
            <Text style={styles.linkText}>{copy.settingsLabel}</Text>
          </Pressable>

          <Pressable
            style={styles.linkRow}
            onPress={() => props.onPressHref(BODY_METRIC_RANGES_EXPLAINER_HREF)}
            accessibilityRole="button"
            accessibilityLabel={copy.rangesExplainerLabel}
            testID="body-composition-ranges-explainer"
          >
            <Text style={styles.linkText}>{copy.rangesExplainerLabel}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },
  cards: {
    gap: 12,
  },
  actions: {
    gap: 10,
    backgroundColor: UI_CARD_SURFACE,
    borderRadius: UI_GROUPED_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: UI_CARD_ELEVATED_BORDER,
    padding: 14,
  },
  actionsTitle: {
    color: UI_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  appleHealthSlot: {
    gap: 8,
  },
  linkRow: {
    minHeight: 44,
    justifyContent: "center",
  },
  linkText: {
    color: BODY_INDIGO,
    fontSize: 15,
    fontWeight: "600",
  },
});
