import React from "react";
import { StyleSheet, View } from "react-native";

import type { BodyMetricCardModel } from "@/lib/body/presentation/bodyMetricCardTypes";
import type {
  BodyFatPrimaryView,
  LeanMassPrimaryView,
  WeightPrimaryView,
} from "@/lib/body/presentation/bodyMetricPrimaryViews";
import {
  BodyMetricSummaryCard,
  type BodyMassDisplayUnit,
  type BodyMetricConnectionActionKind,
} from "@/lib/ui/body/BodyMetricSummaryCard";

export type BodyCompositionConnectionAction = {
  kind: BodyMetricConnectionActionKind;
  label: string;
};

export type BodyCompositionSummaryScreenProps = {
  cards: readonly BodyMetricCardModel[];
  connectionActionForMetric?: (
    metric: BodyMetricCardModel["metric"],
  ) => BodyCompositionConnectionAction;
  /** @deprecated Prefer connectionActionForMetric. */
  connectionAction?: BodyCompositionConnectionAction;
  onPressCard: (href: string) => void;
  onPressAddWeight: () => void;
  onPressConnectionAction?: () => void;
  onPressConnectionActionForMetric?: (metric: BodyMetricCardModel["metric"]) => void;
  /** User mass-unit preference — display only; toggles do not mutate it. */
  massDisplayUnit: BodyMassDisplayUnit;
  weightPrimaryView: WeightPrimaryView;
  onChangeWeightPrimaryView: (view: WeightPrimaryView) => void;
  bodyFatPrimaryView: BodyFatPrimaryView;
  onChangeBodyFatPrimaryView: (view: BodyFatPrimaryView) => void;
  leanMassPrimaryView: LeanMassPrimaryView;
  onChangeLeanMassPrimaryView: (view: LeanMassPrimaryView) => void;
  measurementErrorSlot?: React.ReactNode;
  /** Bottom scroll clearance above floating navigation. */
  bottomClearance?: number;
};

/**
 * Stage 3B landing: three metric cards only (no redundant Add/connect card).
 */
export function BodyCompositionSummaryScreen(props: BodyCompositionSummaryScreenProps) {
  const bottomClearance = props.bottomClearance ?? 28;

  return (
    <View style={styles.root} testID="body-composition-summary-screen">
      {props.measurementErrorSlot}

      <View style={styles.cards} testID="body-composition-metric-cards">
        {props.cards.map((card) => {
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
              weightPrimaryView={props.weightPrimaryView}
              onChangeWeightPrimaryView={props.onChangeWeightPrimaryView}
              bodyFatPrimaryView={props.bodyFatPrimaryView}
              onChangeBodyFatPrimaryView={props.onChangeBodyFatPrimaryView}
              leanMassPrimaryView={props.leanMassPrimaryView}
              onChangeLeanMassPrimaryView={props.onChangeLeanMassPrimaryView}
            />
          );
        })}
      </View>

      <View
        style={{ height: bottomClearance }}
        testID="body-composition-bottom-clearance"
        accessibilityElementsHidden
      />
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
});
